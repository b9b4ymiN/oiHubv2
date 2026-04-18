// lib/db/query.ts
//
// Promise wrappers for DuckDB callback-based API.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'

/**
 * Promisified wrapper for DuckDB's db.all() method.
 * Executes a query and returns all matching rows.
 *
 * @param db - DuckDB database instance
 * @param sql - SQL query string with placeholders (?)
 * @param params - Query parameters
 * @returns Promise resolving to array of result rows
 * @throws Error if query fails
 */
export function dbAll(
  db: DuckDB.Database,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: Record<string, unknown>[]) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows ?? [])
      }
    })
  })
}

/**
 * Promisified wrapper for DuckDB's db.run() method.
 * Executes a query without returning results (INSERT, UPDATE, DELETE, etc.).
 *
 * @param db - DuckDB database instance
 * @param sql - SQL query string with placeholders (?)
 * @param params - Query parameters
 * @returns Promise that resolves when query completes
 * @throws Error if query fails
 */
export function dbRun(
  db: DuckDB.Database,
  sql: string,
  ...params: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, ...params, (err: Error | null) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Promisified wrapper for DuckDB's db.get() method.
 * Executes a query and returns the first matching row.
 *
 * @param db - DuckDB database instance
 * @param sql - SQL query string with placeholders (?)
 * @param params - Query parameters
 * @returns Promise resolving to first result row or null
 * @throws Error if query fails
 */
export function dbGet(
  db: DuckDB.Database,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, row: Record<string, unknown> | undefined) => {
      if (err) {
        reject(err)
      } else {
        resolve(row ?? null)
      }
    }
    // DuckDB's db.get signature: db.get(sql, [params...,] callback)
    // We need to spread params before the callback
    ;(db.get as (...args: unknown[]) => void)(sql, ...params, callback)
  })
}
