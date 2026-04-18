// lib/hooks/useDataHealth.ts

'use client'

import { useState, useEffect, useMemo } from 'react'
import type { QueryObserverResult } from '@tanstack/react-query'
import { DataFreshness, DataSourceConfig, DATA_SOURCE_THRESHOLDS } from '@/lib/websocket/types'
import { calculateFreshness } from '@/lib/websocket/freshness'
import { wsManager } from '@/lib/websocket/manager'
import type { WebSocketHealth } from '@/lib/websocket/types'

export interface RESTDataSource {
  dataUpdatedAt?: number
  isFetching?: boolean
}

export interface DataHealthConfig {
  sourceType: string
  trackWebSocket?: boolean
}

export interface UnifiedDataHealth {
  freshness: DataFreshness
  lastUpdateTime: number
  dataSource: 'rest' | 'websocket' | 'hybrid'
  wsHealth?: WebSocketHealth
  isStale: boolean
}

export function useDataHealth(
  restSource: RESTDataSource | number,
  config?: DataHealthConfig
): UnifiedDataHealth {
  const sourceType = config?.sourceType || 'default'
  const trackWebSocket = config?.trackWebSocket || false
  const threshold: DataSourceConfig = DATA_SOURCE_THRESHOLDS[sourceType] || DATA_SOURCE_THRESHOLDS.default

  // WebSocket health state
  const [wsHealth, setWsHealth] = useState<WebSocketHealth>(wsManager.getHealth())

  // Subscribe to WebSocket health updates when trackWebSocket is enabled
  useEffect(() => {
    if (!trackWebSocket) return

    const unsubscribe = wsManager.subscribeHealth((health) => {
      setWsHealth(health)
    })

    return unsubscribe
  }, [trackWebSocket])

  // Extract REST timestamp from either object or number
  const restTimestamp = useMemo(() => {
    if (typeof restSource === 'number') {
      return restSource
    }
    return restSource.dataUpdatedAt || 0
  }, [restSource])

  // Determine which data source to use and get the most recent update time
  const { dataSource, lastUpdateTime } = useMemo(() => {
    if (!trackWebSocket) {
      return {
        dataSource: 'rest' as const,
        lastUpdateTime: restTimestamp,
      }
    }

    const wsLastMessage = wsHealth.lastMessageTime
    const restTime = restTimestamp
    const wsTime = wsLastMessage

    // If both sources have data, determine which is more recent
    if (restTime > 0 && wsTime > 0) {
      const timeDiff = Math.abs(restTime - wsTime)
      // Consider it hybrid if both are within 5 seconds of each other
      if (timeDiff < 5000) {
        return {
          dataSource: 'hybrid' as const,
          lastUpdateTime: Math.max(restTime, wsTime),
        }
      }
      // Otherwise, use the more recent one
      return {
        dataSource: restTime > wsTime ? ('rest' as const) : ('websocket' as const),
        lastUpdateTime: Math.max(restTime, wsTime),
      }
    }

    // If only one source has data, use it
    if (restTime > 0) {
      return {
        dataSource: 'rest' as const,
        lastUpdateTime: restTime,
      }
    }

    if (wsTime > 0) {
      return {
        dataSource: 'websocket' as const,
        lastUpdateTime: wsTime,
      }
    }

    // No data from either source
    return {
      dataSource: 'rest' as const,
      lastUpdateTime: 0,
    }
  }, [trackWebSocket, wsHealth.lastMessageTime, restTimestamp])

  // Calculate freshness based on the most recent update time
  const freshness = useMemo(() => {
    return calculateFreshness(lastUpdateTime, threshold)
  }, [lastUpdateTime, threshold])

  // Determine if data is stale
  const isStale = useMemo(() => {
    return freshness !== 'fresh'
  }, [freshness])

  return {
    freshness,
    lastUpdateTime,
    dataSource,
    wsHealth: trackWebSocket ? wsHealth : undefined,
    isStale,
  }
}

export function useQueryHealth<T>(
  query: QueryObserverResult<T>,
  sourceType: string = 'default'
): UnifiedDataHealth {
  const restTimestamp = query.dataUpdatedAt || 0
  const isFetching = query.isFetching

  return useDataHealth(
    { dataUpdatedAt: restTimestamp, isFetching },
    { sourceType, trackWebSocket: false }
  )
}
