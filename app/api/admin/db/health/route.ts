// app/api/admin/db/health/route.ts
//
// Database health check endpoint.
// This route is Node.js only (DuckDB is Node-only).

import { NextRequest, NextResponse } from 'next/server'

// Disable static optimization - this route requires runtime database access
export const dynamic = 'force-dynamic'

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  databasePath: string
  tableRowCounts: Record<string, number>
  databaseSizeBytes: number | null
  lastInsertAt: string | null
  migrations: { id: number; name: string; appliedAt: string }[]
  uptime: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  // Dynamic imports to avoid build-time loading of DuckDB native bindings
  const logger = (await import('@/lib/logger')).default

  try {
    const { getDuckDBClient } = await import('@/lib/db/client')
    const { getMigrationHistory } = await import('@/lib/db/migrations')

    const db = getDuckDBClient()

    // Get table row counts for all 7 tables
    const tables = [
      'ohlcv',
      'open_interest',
      'funding_rate',
      'liquidations',
      'long_short_ratio',
      'taker_flow',
      'dataset_metadata'
    ] as const
    const tableRowCounts: Record<string, number> = {}

    // Query each table count in parallel
    const countPromises = tables.map(async (table) => {
      return new Promise<number>((resolve, reject) => {
        db.all(`SELECT COUNT(*) as count FROM ${table}`, (err: Error | null, rows: Record<string, unknown>[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(Number(rows[0]?.count ?? 0))
          }
        })
      })
    })

    const counts = await Promise.all(countPromises)
    tables.forEach((table, index) => {
      tableRowCounts[table] = counts[index]
    })

    // Get last insert timestamp (check ohlcv table as proxy)
    const lastInsertResult = await new Promise<string | null>((resolve, reject) => {
      db.all(
        'SELECT MAX(_inserted_at) as last_insert FROM ohlcv',
        (err: Error | null, rows: Record<string, unknown>[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows[0]?.last_insert ? String(rows[0].last_insert) : null)
          }
        }
      )
    })

    // Get database file size
    const dbPath = process.env.DUCKDB_DATA_DIR || '/data/db/oiHub.duckdb'
    let databaseSizeBytes: number | null = null
    try {
      const fs = await import('fs')
      const stats = fs.statSync(dbPath)
      databaseSizeBytes = stats.size
    } catch {
      // Database file may not exist yet or stat failed
      databaseSizeBytes = null
    }

    // Get migration history
    const migrationHistory = await getMigrationHistory()
    const migrations = migrationHistory.map((m) => ({
      id: m.id,
      name: m.name,
      appliedAt: m.applied_at
    }))

    const responseTime = Date.now() - startTime

    const data: HealthData = {
      status: 'healthy',
      databasePath: dbPath,
      tableRowCounts,
      databaseSizeBytes,
      lastInsertAt: lastInsertResult,
      migrations,
      uptime: process.uptime()
    }

    logger.info({ responseTime, tableRowCounts }, 'Database health check passed')

    return NextResponse.json({
      success: true,
      data,
      meta: { responseTime }
    })
  } catch (error) {
    logger.error({ error }, 'Database health check failed')

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        data: {
          status: 'unhealthy' as const,
          databasePath: process.env.DUCKDB_DATA_DIR || '/data/db/oiHub.duckdb',
          tableRowCounts: {},
          databaseSizeBytes: null,
          lastInsertAt: null,
          migrations: [],
          uptime: process.uptime()
        } satisfies HealthData
      },
      { status: 503 }
    )
  }
}
