// lib/db/migrations/index.ts
//
// Migration runner for DuckDB schema changes.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import fs from 'fs'
import path from 'path'
import { getDuckDBClient } from '@/lib/db/client'
import logger from '@/lib/logger'

interface Migration {
  id: number
  name: string
  sql: string
}

/**
 * Migration registry.
 * Add new migrations to this array with incrementing IDs.
 */
const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: fs.readFileSync(
      path.resolve(process.cwd(), 'lib/db/migrations/001_initial_schema.sql'),
      'utf-8'
    ),
  },
]

/**
 * Create the migrations tracking table if it doesn't exist.
 *
 * @param db - DuckDB database instance
 */
function createMigrationsTable(db: DuckDB.Database): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name VARCHAR NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    db.exec(sql, (err: Error | null) => {
      if (err) {
        logger.error({ error: err }, 'Failed to create migrations table')
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Check if a migration has already been applied.
 *
 * @param db - DuckDB database instance
 * @param migrationId - Migration ID to check
 * @returns Promise<boolean> - true if migration applied, false otherwise
 */
function isMigrationApplied(db: DuckDB.Database, migrationId: number): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    db.all(
      `SELECT id FROM _migrations WHERE id = ${migrationId}`,
      (err: Error | null, rows: unknown[]) => {
        if (err) {
          logger.error({ error: err, migrationId }, 'Failed to check migration status')
          reject(err)
        } else {
          resolve(rows.length > 0)
        }
      }
    )
  })
}

/**
 * Apply a single migration.
 *
 * @param db - DuckDB database instance
 * @param migration - Migration to apply
 */
function applyMigration(db: DuckDB.Database, migration: Migration): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    logger.info({ id: migration.id, name: migration.name }, 'Applying migration')

    // Execute the migration SQL
    db.exec(migration.sql, (err: Error | null) => {
      if (err) {
        logger.error({ error: err, id: migration.id, name: migration.name }, 'Migration failed')
        reject(err)
        return
      }

      // Record the migration as applied
      db.exec(
        `INSERT INTO _migrations (id, name) VALUES (${migration.id}, '${migration.name}')`,
        (insertErr: Error | null) => {
          if (insertErr) {
            logger.error(
              { error: insertErr, id: migration.id },
              'Failed to record migration'
            )
            reject(insertErr)
          } else {
            logger.info({ id: migration.id, name: migration.name }, 'Migration applied successfully')
            resolve()
          }
        }
      )
    })
  })
}

/**
 * Run all pending migrations.
 *
 * This function:
 * 1. Creates the _migrations tracking table if needed
 * 2. Checks each migration in the registry
 * 3. Applies any migrations that haven't been run yet
 * 4. Logs all migration activity
 *
 * @returns Promise that resolves when all migrations are complete
 * @throws Error if any migration fails
 */
export async function runMigrations(): Promise<void> {
  const db = getDuckDBClient()

  try {
    // Ensure migrations table exists
    await createMigrationsTable(db)
    logger.info('Migrations table ready')

    // Apply migrations in order
    for (const migration of migrations) {
      const isApplied = await isMigrationApplied(db, migration.id)

      if (isApplied) {
        logger.info({ id: migration.id, name: migration.name }, 'Migration already applied, skipping')
        continue
      }

      await applyMigration(db, migration)
    }

    logger.info('All migrations completed successfully')
  } catch (error) {
    logger.error({ error }, 'Migration run failed')
    throw error
  }
}

/**
 * Get migration history.
 *
 * @returns Promise<MigrationRecord[]> - Array of applied migrations
 */
export interface MigrationRecord {
  id: number
  name: string
  applied_at: string
}

export function getMigrationHistory(): Promise<MigrationRecord[]> {
  return new Promise<MigrationRecord[]>((resolve, reject) => {
    const db = getDuckDBClient()
    db.all(
      'SELECT id, name, applied_at FROM _migrations ORDER BY id ASC',
      (err: Error | null, rows: unknown[]) => {
        if (err) {
          logger.error({ error: err }, 'Failed to fetch migration history')
          reject(err)
        } else {
          resolve(rows as MigrationRecord[])
        }
      }
    )
  })
}
