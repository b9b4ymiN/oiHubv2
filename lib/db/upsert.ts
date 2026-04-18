// lib/db/upsert.ts
//
// Idempotent upsert utilities for DuckDB.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import logger from '@/lib/logger'

// Schema row types - these will be imported from schema.ts once created
// For now, defining them inline to enable this module
export interface OHLCVRow {
  symbol: string
  interval: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  taker_buy_volume?: number | null
  quote_volume?: number | null
}

export interface OIRow {
  symbol: string
  interval: string
  timestamp: number
  open_interest: number
  oi_change_percent?: number | null
  oi_delta?: number | null
}

export interface FundingRateRow {
  symbol: string
  funding_time: number
  funding_rate: number
  mark_price?: number | null
  index_price?: number | null
  settled?: boolean | null
}

export interface LiquidationRow {
  id: string
  symbol: string
  timestamp: number
  side: 'LONG' | 'SHORT'
  price: number
  quantity: number
  value_in_usd: number
}

export interface LongShortRatioRow {
  symbol: string
  interval: string
  timestamp: number
  long_account_ratio: number
  short_account_ratio: number
  long_short_ratio: number
}

export interface TakerFlowRow {
  symbol: string
  interval: string
  timestamp: number
  buy_volume: number
  sell_volume: number
  buy_sell_ratio: number
  net_flow: number
}

// Table schema definitions
interface TableSchema {
  name: string
  columns: string[]
  pkColumns: string[]
}

const TABLE_SCHEMAS: Record<string, TableSchema> = {
  ohlcv: {
    name: 'ohlcv',
    columns: ['symbol', 'interval', 'timestamp', 'open', 'high', 'low', 'close', 'volume', 'taker_buy_volume', 'quote_volume'],
    pkColumns: ['symbol', 'interval', 'timestamp'],
  },
  open_interest: {
    name: 'open_interest',
    columns: ['symbol', 'interval', 'timestamp', 'open_interest', 'oi_change_percent', 'oi_delta'],
    pkColumns: ['symbol', 'interval', 'timestamp'],
  },
  funding_rate: {
    name: 'funding_rate',
    columns: ['symbol', 'funding_time', 'funding_rate', 'mark_price', 'index_price', 'settled'],
    pkColumns: ['symbol', 'funding_time'],
  },
  liquidations: {
    name: 'liquidations',
    columns: ['id', 'symbol', 'timestamp', 'side', 'price', 'quantity', 'value_in_usd'],
    pkColumns: ['id'],
  },
  long_short_ratio: {
    name: 'long_short_ratio',
    columns: ['symbol', 'interval', 'timestamp', 'long_account_ratio', 'short_account_ratio', 'long_short_ratio'],
    pkColumns: ['symbol', 'interval', 'timestamp'],
  },
  taker_flow: {
    name: 'taker_flow',
    columns: ['symbol', 'interval', 'timestamp', 'buy_volume', 'sell_volume', 'buy_sell_ratio', 'net_flow'],
    pkColumns: ['symbol', 'interval', 'timestamp'],
  },
}

/**
 * Build upsert SQL for batch insert with ON CONFLICT handling.
 */
function buildUpsertSQL(
  table: string,
  columns: string[],
  pkColumns: string[],
  rowCount: number
): string {
  const columnList = columns.join(', ')

  // Build VALUES placeholders: (?, ?, ?), (?, ?, ?), ...
  const rowPlaceholders = `(${columns.map(() => '?').join(', ')})`
  const valuesClause = Array(rowCount).fill(rowPlaceholders).join(', ')

  // Build DO UPDATE SET clause (only non-PK columns)
  const nonPkColumns = columns.filter(col => !pkColumns.includes(col))
  const updateSetClause = nonPkColumns.map(col => `${col} = excluded.${col}`).join(', ')

  return `INSERT INTO ${table} (${columnList}) VALUES ${valuesClause} ON CONFLICT (${pkColumns.join(', ')}) DO UPDATE SET ${updateSetClause}`
}

/**
 * Execute a batched upsert operation.
 */
async function executeBatchUpsert(
  db: DuckDB.Database,
  table: string,
  columns: string[],
  pkColumns: string[],
  rows: (string | number | boolean | null)[][],
  batchSize: number = 100
): Promise<void> {
  if (rows.length === 0) {
    return
  }

  const totalRows = rows.length
  let processedRows = 0

  while (processedRows < totalRows) {
    const batch = rows.slice(processedRows, processedRows + batchSize)
    const sql = buildUpsertSQL(table, columns, pkColumns, batch.length)

    // Flatten the batch into a single array of parameters
    const params: (string | number | boolean | null)[] = batch.flat()

    await new Promise<void>((resolve, reject) => {
      // DuckDB 1.1.0 requires spread args, not array
      db.run(sql, ...params, (err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })

    processedRows += batch.length
  }

  logger.info({
    table,
    rowsInserted: totalRows,
  }, 'Upsert completed')
}

/**
 * Convert row objects to parameter arrays in column order.
 */
function rowsToParams<T extends object>(
  rows: T[],
  columns: string[]
): (string | number | boolean | null)[][] {
  return rows.map(row =>
    columns.map(col => {
      const val = (row as Record<string, unknown>)[col]
      return val === undefined ? null : (val as string | number | boolean | null)
    })
  )
}

// Exported upsert functions for each table

export async function upsertOHLCV(db: DuckDB.Database, data: OHLCVRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.ohlcv
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}

export async function upsertOI(db: DuckDB.Database, data: OIRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.open_interest
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}

export async function upsertFundingRate(db: DuckDB.Database, data: FundingRateRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.funding_rate
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}

export async function upsertLiquidations(db: DuckDB.Database, data: LiquidationRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.liquidations
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}

export async function upsertLongShortRatio(db: DuckDB.Database, data: LongShortRatioRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.long_short_ratio
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}

export async function upsertTakerFlow(db: DuckDB.Database, data: TakerFlowRow[]): Promise<void> {
  const schema = TABLE_SCHEMAS.taker_flow
  const params = rowsToParams(data, schema.columns)
  await executeBatchUpsert(db, schema.name, schema.columns, schema.pkColumns, params)
}
