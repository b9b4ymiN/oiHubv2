// lib/db/schema.ts
//
// TypeScript type definitions for DuckDB tables.
// These types represent the schema of our data warehouse.

/**
 * OHLCV (Open, High, Low, Close, Volume) market data.
 */
export interface OHLCVRow extends Record<string, unknown> {
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
  _inserted_at?: string
  _source?: string
}

/**
 * Open Interest data for futures/perpetual contracts.
 */
export interface OIRow extends Record<string, unknown> {
  symbol: string
  interval: string
  timestamp: number
  open_interest: number
  oi_change_percent?: number | null
  oi_delta?: number | null
  _inserted_at?: string
}

/**
 * Funding rate data for perpetual futures.
 */
export interface FundingRateRow extends Record<string, unknown> {
  symbol: string
  funding_time: number
  funding_rate: number
  mark_price: number
  index_price?: number | null
  settled?: boolean
  _inserted_at?: string
}

/**
 * Liquidation events from the exchange.
 */
export interface LiquidationRow extends Record<string, unknown> {
  id: string
  symbol: string
  timestamp: number
  side: 'LONG' | 'SHORT'
  price: number
  quantity: number
  value_in_usd?: number | null
  _inserted_at?: string
}

/**
 * Long/Short account ratio data.
 */
export interface LongShortRatioRow extends Record<string, unknown> {
  symbol: string
  interval: string
  timestamp: number
  long_account_ratio: number
  short_account_ratio: number
  long_short_ratio: number
  _inserted_at?: string
}

/**
 * Taker buy/sell flow data (aggressors vs makers).
 */
export interface TakerFlowRow extends Record<string, unknown> {
  symbol: string
  interval: string
  timestamp: number
  buy_volume: number
  sell_volume: number
  buy_sell_ratio: number
  net_flow: number
  _inserted_at?: string
}

/**
 * Metadata about datasets stored in the warehouse.
 */
export interface DatasetMetadataRow extends Record<string, unknown> {
  dataset_id: string
  symbol: string
  data_type: string
  interval?: string | null
  start_timestamp: number
  end_timestamp: number
  version: string
  created_at?: string
  updated_at?: string
  row_count?: number | null
  quality_score?: number | null
  last_verified_at?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Supported data types in the warehouse.
 */
export type DataType =
  | 'ohlcv'
  | 'open_interest'
  | 'funding_rate'
  | 'liquidations'
  | 'long_short_ratio'
  | 'taker_flow'

/**
 * Supported time intervals for aggregated data.
 */
export const VALID_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Interval = typeof VALID_INTERVALS[number]

/**
 * Supported trading symbols.
 */
export const VALID_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const
export type Symbol = typeof VALID_SYMBOLS[number]

/**
 * Union type of all table row types.
 */
export type TableRow =
  | OHLCVRow
  | OIRow
  | FundingRateRow
  | LiquidationRow
  | LongShortRatioRow
  | TakerFlowRow
  | DatasetMetadataRow
