// lib/db/client.ts
//
// DuckDB client wrapper for oiHubv2.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import logger from '@/lib/logger'

// Singleton pattern for DuckDB connection
let dbInstance: DuckDB.Database | null = null

/**
 * Get or create the DuckDB client singleton.
 * Uses lazy initialization - connection is created on first access.
 *
 * @returns Database instance
 * @throws Error if database initialization fails
 */
export function getDuckDBClient(): DuckDB.Database {
  if (!dbInstance) {
    const dbPath = process.env.DUCKDB_DATA_DIR || '/data/db/oiHub.duckdb'
    logger.info({ dbPath }, 'Initializing DuckDB connection')

    try {
      dbInstance = new DuckDB.Database(dbPath)
      logger.info('DuckDB connection established')
    } catch (error) {
      logger.error({ error }, 'Failed to initialize DuckDB')
      throw error
    }
  }
  return dbInstance
}

/**
 * Close the DuckDB connection.
 * Safe to call multiple times - subsequent calls are no-ops.
 *
 * @returns Promise that resolves when connection is closed
 */
export function closeDuckDB(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close((err: Error | null) => {
        if (err) {
          logger.error({ error: err }, 'Error closing DuckDB')
          reject(err)
        } else {
          logger.info('DuckDB connection closed')
          dbInstance = null
          resolve()
        }
      })
    } else {
      resolve()
    }
  })
}
