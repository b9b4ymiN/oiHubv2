// lib/websocket/types.ts

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export type DataFreshness = 'fresh' | 'stale' | 'disconnected'

export interface WebSocketHealth {
  state: ConnectionState
  lastMessageTime: number
  reconnectAttempts: number
  isReconnecting: boolean
}

export interface DataSourceConfig {
  staleThresholdMs: number
  criticalThresholdMs: number
}

export const DATA_SOURCE_THRESHOLDS: Record<string, DataSourceConfig> = {
  klines: { staleThresholdMs: 30000, criticalThresholdMs: 60000 },
  openInterest: { staleThresholdMs: 30000, criticalThresholdMs: 60000 },
  fundingRate: { staleThresholdMs: 60000, criticalThresholdMs: 120000 },
  orderbookDepth: { staleThresholdMs: 5000, criticalThresholdMs: 15000 },
  liquidations: { staleThresholdMs: 15000, criticalThresholdMs: 45000 },
  oiHeatmap: { staleThresholdMs: 60000, criticalThresholdMs: 120000 },
  default: { staleThresholdMs: 30000, criticalThresholdMs: 60000 },
}

export interface RESTHealth {
  dataUpdatedAt: number | undefined
  isFetching: boolean
}

export interface UnifiedHealth {
  freshness: DataFreshness
  lastUpdateTime: number
  dataSource: 'rest' | 'websocket' | 'hybrid'
}
