# Phase 0 Tranche B: WebSocket Reconnection Hardening + Hybrid Data Health Detection

**Status:** Implementation Plan (REVISED - Iteration 1)
**Created:** 2026-04-18
**Revised:** 2026-04-18
**Tranche:** B — WebSocket Resilience
**Priority:** HIGH (next in Phase 0 sequence)

---

## RALPLAN-DR Summary

### Principles (3-5)

1. **Signal over silence** — Users must always know data freshness state; hidden staleness is worse than visible disconnection.
2. **Bounded resilience** — Reconnection attempts must be finite and capped; infinite reconnection loops are resource leaks.
3. **Event-driven health** — WebSocket state changes emit immediately via subscription; polling is eliminated to prevent TOCTOU gaps.
4. **Graceful degradation** — UI remains functional during stale/disconnected states with clear indicators, not blank screens.
5. **Hybrid awareness** — REST (TanStack Query) and WebSocket have separate health tracking but unified UI presentation.

### Decision Drivers (top 3)

1. **Tranche B acceptance criteria** (from PHASE-0-TEST-SPEC.md): stale status derived from last successful message time, bounded exponential backoff, UI distinguishes fresh/stale/disconnected.
2. **Read-only platform constraint** (from AGENTS.md): Cannot add live order placement; resilience is purely for data display reliability.
3. **Production reliability** — Dashboard/heatmap use REST (TanStack Query) but specialized streams (klines, liquidations) use WebSocket; both need visible health status.

### Viable Options (>=2) with bounded pros/cons

#### Option A: Event-driven WebSocket health + unified `useDataHealth` hook (CHOSEN)

**Approach:**
- Add `subscribeHealth()` method to `WebSocketManager` that emits on state changes
- Add `isReconnecting` guard to prevent duplicate connections
- Create unified `useDataHealth` hook that aggregates REST (TanStack Query `dataUpdatedAt`) AND WebSocket health
- Per-data-type staleness thresholds derived from existing `staleTime` values

**Pros:**
- Event-driven: zero TOCTOU gap, instant state propagation
- Correctly handles hybrid architecture (REST dashboard + WS streams)
- Reusable `useDataHealth` hook for any data source
- Reconnect guard prevents race conditions
- Configurable thresholds match data velocity (orderbook 5s, funding 60s)

**Cons:**
- Requires new subscription mechanism in WebSocketManager
- Hook must handle both REST and WS sources (slightly more complex)

#### Option B: Separate health hooks for REST and WebSocket

**Approach:**
- `useWebSocketHealth` for WS streams only
- `useQueryHealth` for TanStack Query data
- Components choose which hook to use

**Pros:**
- Simpler individual hooks
- Clear separation of concerns

**Cons:**
- Divergent health display patterns across UI
- Components must know data source (REST vs WS)
- No unified health status for hybrid pages
- TOCTOU gap remains with polling-based approach

#### Option C: Global health context provider

**Approach:**
- Create React Context with global health state
- All data sources update global state
- Components consume from context

**Pros:**
- Single source of truth
- Easy global connection indicator

**Cons:**
- Large architectural change for Phase 0
- All consumers must adopt Context pattern
- More complex state synchronization
- Violates "keep diffs small" principle

### Decision: **Option A**

**Rationale:** Option A correctly addresses the hybrid architecture (REST dashboard + WebSocket streams) while staying within Phase 0's "small, reviewable, scoped" constraint. Event-driven `subscribeHealth()` eliminates TOCTOU gap. Unified `useDataHealth` provides consistent health display regardless of data source. Reconnect guard prevents the race condition identified by Critic.

**Alternatives invalidated:**
- Option B creates divergent patterns and doesn't solve TOCTOU gap
- Option C is architectural overreach for Phase 0; better suited for Phase 1+ when centralized connection UI becomes a requirement

---

## Work Objectives

1. Implement event-driven health subscription in `WebSocketManager` (`subscribeHealth()`)
2. Add reconnect guard (`isReconnecting` flag) to prevent duplicate connections
3. Create unified `useDataHealth` hook that aggregates REST (TanStack Query) and WebSocket health
4. Add per-data-type staleness thresholds derived from existing `staleTime` values
5. Create UI components to display fresh / stale / disconnected states
6. Add unit tests for reconnection logic, event-driven health, and hybrid staleness
7. Add E2E test for WS-down-but-REST-up scenario

---

## Guardrails

### Must Have

- Event-driven `subscribeHealth()` method on WebSocketManager (no polling)
- `isReconnecting` guard to prevent duplicate WS connections
- Unified `useDataHealth` hook that accepts both REST and WS health sources
- Per-data-type staleness thresholds (orderbook ~5s, funding ~60s, etc.)
- UI distinguishes three states: **fresh**, **stale**, **disconnected**
- All timestamps UTC milliseconds
- Existing hooks continue to work (backward compatibility)
- E2E test validates "WS down, REST OK" scenario

### Must NOT Have

- Live order placement or trading capabilities
- Fabricated/synthesized market data
- Breaking changes to existing hook APIs
- Dependencies on `archived/` directory
- Local time conversions in staleness logic
- Silent failures (connection issues must be surfaced)
- Polling-based health checking (must be event-driven)
- Single one-size-fits-all staleness threshold

---

## Task Flow

```
1. Enhance WebSocketManager (event-driven health + reconnect guard)
   ↓
2. Create connection health types and per-data-type thresholds
   ↓
3. Create unified useDataHealth hook (REST + WS aggregation)
   ↓
4. Create UI components (ConnectionStatusIndicator, DataFreshnessBadge)
   ↓
5. Integrate status indicators into dashboard/heatmap pages
   ↓
6. Add unit tests (event-driven health, reconnect guard, hybrid staleness)
   ↓
7. Add E2E test (WS-down-but-REST-up scenario verification)
```

---

## Detailed TODOs

### Task 1: Enhance `WebSocketManager` with event-driven health and reconnect guard

**File:** `lib/websocket/manager.ts`

**Changes:**

1. Add health tracking and state management properties:
   ```typescript
   private lastMessageTime: number = Date.now()
   private connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected'
   private reconnectDelay: number = 1000
   private maxReconnectDelay: number = 30000  // 30s max
   private maxReconnectAttempts: number = 10  // Increased from 5
   private reconnectAttempts: number = 0
   private isReconnecting: boolean = false  // NEW: Guard against duplicate connections
   private healthSubscribers = new Set<(health: WebSocketHealth) => void>()  // NEW: Event-driven subscriptions
   ```

2. Implement bounded exponential backoff with jitter:
   ```typescript
   private getNextReconnectDelay(): number {
     const baseDelay = Math.min(
       this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
       this.maxReconnectDelay
     )
     // Add ±20% jitter to avoid thundering herd
     const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1)
     return Math.floor(baseDelay + jitter)
   }
   ```

3. Add `subscribeHealth()` method for event-driven health updates:
   ```typescript
   subscribeHealth(callback: (health: WebSocketHealth) => void): () => void {
     this.healthSubscribers.add(callback)
     // Immediately emit current health state
     callback(this.getHealth())
     // Return unsubscribe function
     return () => this.healthSubscribers.delete(callback)
   }

   private emitHealth(): void {
     const health = this.getHealth()
     this.healthSubscribers.forEach(callback => {
       try {
         callback(health)
       } catch (error) {
         console.error('Health subscription error:', error)
       }
     })
   }
   ```

4. Add health getter method:
   ```typescript
   getHealth(): WebSocketHealth {
     return {
       state: this.connectionState,
       lastMessageTime: this.lastMessageTime,
       reconnectAttempts: this.reconnectAttempts,
       isReconnecting: this.isReconnecting
     }
   }
   ```

5. Update `onmessage` to track last successful message time and emit health:
   ```typescript
   this.ws.onmessage = (event) => {
     try {
       const message = JSON.parse(event.data)
       if (message.stream && message.data) {
         this.lastMessageTime = Date.now()  // Track successful message
         const callbacks = this.subscriptions.get(message.stream)
         if (callbacks) {
           callbacks.forEach(callback => callback(message.data))
         }
       }
     } catch (error) {
       console.error('WebSocket message parse error:', error)
     }
     // Emit health update after each message
     this.emitHealth()
   }
   ```

6. Update `onopen`, `onclose`, `onerror` to set connection state and emit health:
   ```typescript
   this.ws.onopen = () => {
     console.log('WebSocket connected')
     this.reconnectAttempts = 0
     this.connectionState = 'connected'
     this.isReconnecting = false
     this.emitHealth()
   }

   this.ws.onclose = () => {
     console.log('WebSocket closed')
     this.connectionState = 'disconnected'
     this.emitHealth()
     this.handleReconnect()
   }

   this.ws.onerror = (error) => {
     console.error('WebSocket error:', error)
     this.emitHealth()
   }
   ```

7. Update `connect()` with reconnect guard:
   ```typescript
   private connect() {
     // Guard: Prevent duplicate connections
     if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
       console.log('Connection already in progress or established')
       return
     }

     const streams = Array.from(this.subscriptions.keys()).join('/')
     if (!streams) return

     this.isReconnecting = true
     this.connectionState = 'connecting'
     this.emitHealth()

     const url = `${this.baseUrl}/stream?streams=${streams}`

     try {
       this.ws = new WebSocket(url)
       // ... rest of connection logic
     } catch (error) {
       console.error('WebSocket connection error:', error)
       this.isReconnecting = false
       this.emitHealth()
       this.handleReconnect()
     }
   }
   ```

8. Update `handleReconnect` to use new backoff logic and health emission:
   ```typescript
   private handleReconnect() {
     this.isReconnecting = false

     if (this.reconnectAttempts < this.maxReconnectAttempts) {
       this.reconnectAttempts++
       this.connectionState = 'reconnecting'
       this.emitHealth()

       const delay = this.getNextReconnectDelay()
       console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

       setTimeout(() => {
         this.connect()
       }, delay)
     } else {
       console.error('Max reconnection attempts reached')
       this.connectionState = 'disconnected'
       this.emitHealth()
     }
   }
   ```

**Acceptance Criteria:**
- Reconnection delay increases exponentially (1s, 2s, 4s, 8s, ... up to 30s)
- Max 10 reconnection attempts (configurable)
- `isReconnecting` guard prevents duplicate connections
- `subscribeHealth()` emits immediately on subscribe and on every state change
- Last message time updates on every successful message parse
- Jitter prevents thundering herd on mass reconnection

**Test Requirements:**
- Unit test: backoff sequence matches expected delays
- Unit test: max delay cap enforced
- Unit test: jitter within ±20% bounds
- Unit test: state transitions correct (connecting → connected → disconnected)
- Unit test: `subscribeHealth()` callback fires immediately on subscribe
- Unit test: `subscribeHealth()` callback fires on every state change
- Unit test: `isReconnecting` guard prevents duplicate `connect()` calls

---

### Task 2: Create connection health types and per-data-type thresholds

**File:** `lib/websocket/types.ts` (new)

**Types:**

```typescript
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export type DataFreshness = 'fresh' | 'stale' | 'disconnected'

export interface WebSocketHealth {
  state: ConnectionState
  lastMessageTime: number
  reconnectAttempts: number
  isReconnecting: boolean
}

// Per-data-type staleness thresholds derived from existing TanStack Query staleTime values
export interface DataSourceConfig {
  // REST: derived from TanStack Query staleTime
  // WS: derived from expected message frequency
  staleThresholdMs: number
  criticalThresholdMs: number
}

// Thresholds derived from actual useMarketData.ts staleTime values:
// - useKlines: staleTime 15000, refetchInterval 30000 → threshold 30000
// - useOpenInterest: staleTime 15000, refetchInterval 30000 → threshold 30000
// - useFundingRate: staleTime 30000, refetchInterval 60000 → threshold 60000
// - useOrderbookDepth: staleTime 3000, refetchInterval 5000 → threshold 5000
// - useLiquidations: staleTime 10000, refetchInterval 15000 → threshold 15000
// - useOIHeatmap: staleTime 30000, refetchInterval 60000 → threshold 60000

export const DATA_SOURCE_THRESHOLDS: Record<string, DataSourceConfig> = {
  klines: { staleThresholdMs: 30_000, criticalThresholdMs: 60_000 },
  openInterest: { staleThresholdMs: 30_000, criticalThresholdMs: 60_000 },
  fundingRate: { staleThresholdMs: 60_000, criticalThresholdMs: 120_000 },
  orderbookDepth: { staleThresholdMs: 5_000, criticalThresholdMs: 15_000 },
  liquidations: { staleThresholdMs: 15_000, criticalThresholdMs: 45_000 },
  oiHeatmap: { staleThresholdMs: 60_000, criticalThresholdMs: 120_000 },
  // Default for unknown sources
  default: { staleThresholdMs: 30_000, criticalThresholdMs: 60_000 }
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
```

**File:** `lib/websocket/freshness.ts` (new)

**Utilities:**

```typescript
import { DataSourceConfig, DataFreshness } from './types'

export function calculateFreshness(
  lastUpdateTime: number,
  config: DataSourceConfig = { staleThresholdMs: 30_000, criticalThresholdMs: 60_000 }
): DataFreshness {
  const now = Date.now()
  const ageMs = now - lastUpdateTime

  if (ageMs < 0) return 'fresh'  // Clock skew; treat as fresh
  if (ageMs > config.criticalThresholdMs) return 'disconnected'
  if (ageMs > config.staleThresholdMs) return 'stale'
  return 'fresh'
}

export function getFreshnessColor(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh': return 'text-green-400'
    case 'stale': return 'text-yellow-400'
    case 'disconnected': return 'text-red-400'
  }
}

export function getFreshnessLabel(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh': return 'LIVE'
    case 'stale': return 'STALE'
    case 'disconnected': return 'OFFLINE'
  }
}

export function getThresholdForDataSource(source: string): DataSourceConfig {
  return DATA_SOURCE_THRESHOLDS[source] || DATA_SOURCE_THRESHOLDS.default
}
```

**Acceptance Criteria:**
- Types align with Phase 0 Test Spec (fresh/stale/disconnected)
- Thresholds derived from actual TanStack Query `staleTime` values in useMarketData.ts
- Utility functions for UI rendering
- Export via `lib/websocket/index.ts`

**Test Requirements:**
- Unit test: calculateFreshness returns correct state for various ages
- Unit test: negative age (clock skew) returns fresh
- Unit test: getFreshnessColor returns valid Tailwind classes
- Unit test: getThresholdForDataSource returns correct threshold per data type

---

### Task 3: Create unified `useDataHealth` hook (REST + WS aggregation)

**File:** `lib/hooks/useDataHealth.ts` (new)

**New unified hook:**

```typescript
import { useEffect, useState, useMemo } from 'react'
import { wsManager } from '@/lib/websocket/manager'
import { WebSocketHealth } from '@/lib/websocket/types'
import { calculateFreshness, getThresholdForDataSource } from '@/lib/websocket/freshness'
import type { QueryObserverResult } from '@tanstack/react-query'

/**
 * Represents health state for a REST data source (TanStack Query)
 */
export interface RESTDataSource {
  dataUpdatedAt?: number
  isFetching?: boolean
}

/**
 * Configuration for data health tracking
 */
export interface DataHealthConfig {
  // Data source type for threshold selection
  sourceType: keyof typeof DATA_SOURCE_THRESHOLDS | 'default'
  // Whether to track WebSocket health (false = REST only)
  trackWebSocket?: boolean
}

/**
 * Unified health state combining REST and WebSocket information
 */
export interface UnifiedDataHealth {
  freshness: 'fresh' | 'stale' | 'disconnected'
  lastUpdateTime: number
  dataSource: 'rest' | 'websocket' | 'hybrid'
  wsHealth?: WebSocketHealth
  isStale: boolean
}

/**
 * Hook for tracking data freshness across REST (TanStack Query) and WebSocket sources.
 *
 * For REST data: Uses TanStack Query's `dataUpdatedAt` timestamp.
 * For WebSocket data: Uses `subscribeHealth()` for event-driven updates.
 *
 * @param restSource - TanStack Query result or manual timestamp
 * @param config - Health tracking configuration
 */
export function useDataHealth(
  restSource: RESTDataSource | number,
  config: DataHealthConfig = { sourceType: 'default' }
): UnifiedDataHealth {
  const [wsHealth, setWsHealth] = useState<WebSocketHealth>(() => wsManager.getHealth())

  // Event-driven WebSocket health subscription
  useEffect(() => {
    if (!config.trackWebSocket) return

    // Subscribe to health changes (event-driven, no polling)
    const unsubscribe = wsManager.subscribeHealth((health) => {
      setWsHealth(health)
    })

    return unsubscribe
  }, [config.trackWebSocket])

  // Extract REST timestamp
  const restTimestamp = useMemo(() => {
    if (typeof restSource === 'number') return restSource
    return restSource.dataUpdatedAt
  }, [restSource])

  // Determine which data source to use for freshness
  const { dataSource, lastUpdateTime } = useMemo(() => {
    // If we're tracking WebSocket and it has recent data, use WS
    if (config.trackWebSocket && wsHealth.lastMessageTime > 0) {
      const wsAge = Date.now() - wsHealth.lastMessageTime
      const restAge = restTimestamp ? Date.now() - restTimestamp : Infinity

      // Use WS if it's more recent or within 2x the REST stale threshold
      if (wsAge < restAge || wsAge < (getThresholdForDataSource(config.sourceType).staleThresholdMs * 2)) {
        return { dataSource: 'websocket' as const, lastUpdateTime: wsHealth.lastMessageTime }
      }
    }

    // Otherwise use REST data
    if (restTimestamp) {
      return { dataSource: 'rest' as const, lastUpdateTime: restTimestamp }
    }

    // No data available
    return { dataSource: 'rest' as const, lastUpdateTime: 0 }
  }, [config.trackWebSocket, wsHealth, restTimestamp, config.sourceType])

  // Calculate freshness based on the active data source
  const threshold = getThresholdForDataSource(config.sourceType)
  const freshness = useMemo(() => {
    if (lastUpdateTime === 0) return 'disconnected'
    return calculateFreshness(lastUpdateTime, threshold)
  }, [lastUpdateTime, threshold])

  return {
    freshness,
    lastUpdateTime,
    dataSource,
    wsHealth: config.trackWebSocket ? wsHealth : undefined,
    isStale: freshness === 'stale' || freshness === 'disconnected'
  }
}

/**
 * Convenience hook for TanStack Query results
 */
export function useQueryHealth(
  query: Pick<QueryObserverResult, 'dataUpdatedAt' | 'isFetching'>,
  sourceType: DataHealthConfig['sourceType']
): UnifiedDataHealth {
  return useDataHealth({ dataUpdatedAt: query.dataUpdatedAt, isFetching: query.isFetching }, { sourceType })
}
```

**File:** `lib/hooks/useMarketData.ts` (modify existing)

**Optional: Add health tracking export (non-breaking)**

For consumers that want explicit health tracking, export a helper:

```typescript
// At the bottom of useMarketData.ts
export { useDataHealth, useQueryHealth } from './useDataHealth'
```

**Note:** The original plan proposed modifying all hooks to return staleness info. Based on Architect/Critic feedback, this creates unnecessary coupling. Instead, consumers use `useDataHealth` or `useQueryHealth` directly when they need status display.

**Acceptance Criteria:**
- `useDataHealth` accepts REST timestamp (number or object with `dataUpdatedAt`)
- `useDataHealth` optionally tracks WebSocket health via `trackWebSocket` flag
- `useQueryHealth` provides convenience wrapper for TanStack Query results
- Uses event-driven `subscribeHealth()` for WebSocket (no polling)
- Correctly selects WS vs REST based on recency
- Returns unified freshness state

**Test Requirements:**
- Unit test: hook updates on WebSocket health events (not polling)
- Unit test: hook cleanup on unmount
- Unit test: threshold varies by data source type
- Unit test: WS selected when more recent than REST
- Unit test: REST selected when WS not tracked

---

### Task 4: Create UI components for connection/freshness display

**File:** `components/ui/connection-status.tsx` (new)

**Component 1: ConnectionStatusIndicator**

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { useDataHealth } from '@/lib/hooks/useDataHealth'
import { cn } from '@/lib/utils'
import { Activity, WifiOff, Clock } from 'lucide-react'

interface ConnectionStatusIndicatorProps {
  // For REST data: pass dataUpdatedAt timestamp
  restDataUpdatedAt?: number
  // Data source type for threshold selection
  sourceType?: 'klines' | 'openInterest' | 'fundingRate' | 'orderbookDepth' | 'liquidations' | 'oiHeatmap' | 'default'
  // Whether to track WebSocket health
  trackWebSocket?: boolean
  className?: string
}

export function ConnectionStatusIndicator({
  restDataUpdatedAt,
  sourceType = 'default',
  trackWebSocket = false,
  className
}: ConnectionStatusIndicatorProps) {
  const health = useDataHealth(restDataUpdatedAt || 0, { sourceType, trackWebSocket })

  const config = {
    fresh: {
      icon: Activity,
      label: 'LIVE',
      color: 'bg-green-500/10 border-green-500/30 text-green-400',
      animate: true
    },
    stale: {
      icon: Clock,
      label: 'STALE',
      color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      animate: false
    },
    disconnected: {
      icon: WifiOff,
      label: 'OFFLINE',
      color: 'bg-red-500/10 border-red-500/30 text-red-400',
      animate: false
    }
  }[health.freshness]

  const Icon = config.icon

  return (
    <Badge className={cn("border px-2 py-1", config.color, className)}>
      <Icon className={cn("w-3 h-3 mr-1", config.animate && "animate-pulse")} />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  )
}
```

**Component 2: DataFreshnessBadge** (compact version for cards)

```typescript
'use client'

import { useDataHealth } from '@/lib/hooks/useDataHealth'
import { cn } from '@/lib/utils'
import { Activity, Clock, WifiOff } from 'lucide-react'

interface DataFreshnessBadgeProps {
  // For REST data: pass dataUpdatedAt timestamp
  dataUpdatedAt: number
  // Data source type for threshold selection
  sourceType?: 'klines' | 'openInterest' | 'fundingRate' | 'orderbookDepth' | 'liquidations' | 'oiHeatmap' | 'default'
  // Display mode
  variant?: 'dot' | 'icon' | 'badge'
  className?: string
}

export function DataFreshnessBadge({
  dataUpdatedAt,
  sourceType = 'default',
  variant = 'dot',
  className
}: DataFreshnessBadgeProps) {
  const health = useDataHealth(dataUpdatedAt, { sourceType })

  if (variant === 'dot') {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          health.freshness === 'fresh' && "bg-green-500 animate-pulse",
          health.freshness === 'stale' && "bg-yellow-500",
          health.freshness === 'disconnected' && "bg-red-500"
        )} />
        <span className={cn(
          "font-medium",
          health.freshness === 'fresh' && "text-green-400",
          health.freshness === 'stale' && "text-yellow-400",
          health.freshness === 'disconnected' && "text-red-400"
        )}>
          {health.freshness.toUpperCase()}
        </span>
      </div>
    )
  }

  if (variant === 'icon') {
    const Icon = health.freshness === 'fresh' ? Activity : health.freshness === 'stale' ? Clock : WifiOff
    const color = health.freshness === 'fresh' ? 'text-green-400' : health.freshness === 'stale' ? 'text-yellow-400' : 'text-red-400'
    const animate = health.freshness === 'fresh'

    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        <Icon className={cn("w-3 h-3", color, animate && "animate-pulse")} />
        <span className={cn("font-medium", color)}>{health.freshness.toUpperCase()}</span>
      </div>
    )
  }

  // Default: badge variant
  return (
    <div className={cn(
      "px-2 py-0.5 rounded text-xs font-medium border",
      health.freshness === 'fresh' && "bg-green-500/10 border-green-500/30 text-green-400",
      health.freshness === 'stale' && "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      health.freshness === 'disconnected' && "bg-red-500/10 border-red-500/30 text-red-400"
    )}>
      {health.freshness.toUpperCase()}
    </div>
  )
}
```

**Acceptance Criteria:**
- `ConnectionStatusIndicator` works with both REST and WebSocket health
- Visual distinction: green (fresh), yellow (stale), red (disconnected)
- Pulse animation on fresh state
- `DataFreshnessBadge` accepts explicit timestamp and source type
- Three display variants: dot, icon, badge

**Test Requirements:**
- Visual regression test (screenshot): all three states render correctly
- Unit test: timestamp age calculations match expected labels
- Unit test: source type selects correct threshold

---

### Task 5: Integrate status indicators into dashboard and heatmap pages

**File:** `app/dashboard/page.tsx`

**Changes:**

1. Import and render `ConnectionStatusIndicator` in header:
   ```tsx
   import { ConnectionStatusIndicator } from '@/components/ui/connection-status'
   import { useQuery } from '@tanstack/react-query'  // Already imported

   // Inside DashboardPage component, add data tracking for header status
   // Use the OI heatmap data as the primary freshness indicator
   const { dataUpdatedAt: oiDataUpdatedAt } = useOIHeatmap(symbol, interval, 288, priceStep)

   // In header, alongside AskAIButton:
   <div className="flex items-center gap-2 flex-wrap">
     <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
     <IntervalSelector interval={interval} onIntervalChange={setInterval} />
     {/* Add connection status indicator */}
     <ConnectionStatusIndicator
       restDataUpdatedAt={oiDataUpdatedAt}
       sourceType="oiHeatmap"
     />
     <AskAIButton
       context={createFullContext()}
       question="Analyze current dashboard state and provide comprehensive trading insights"
       variant="default"
       size="sm"
       className="animate-pulse-slow"
     />
   </div>
   ```

2. Add data freshness badges to key analytics cards (optional, for detailed view):
   ```tsx
   // In OI Momentum Card section, add freshness indicator
   <div className="flex items-center justify-between">
     <h2 className="text-sm sm:text-xl font-bold text-purple-900 dark:text-purple-100">
       OI Momentum & Acceleration
     </div>
     <DataFreshnessBadge
       dataUpdatedAt={oiMomentumData?.timestamp || Date.now()}
       sourceType="openInterest"
       variant="icon"
     />
   </div>
   ```

**File:** `app/heatmap/oi/page.tsx`

**Changes:**

1. Replace static "Live Data" badge with dynamic indicator:
   ```tsx
   import { ConnectionStatusIndicator, DataFreshnessBadge } from '@/components/ui/connection-status'

   // Use the existing useOIHeatmap hook
   const { data: heatmapResponse, isLoading } = useOIHeatmap(symbol, interval, 288, priceStep)

   // Extract timestamp from response (if available) or use dataUpdatedAt from TanStack Query
   const queryClient = useQueryClient()
   const queryState = queryClient.getQueryState(['oiHeatmap', symbol, interval, 288, priceStep])
   const dataUpdatedAt = queryState?.dataUpdatedAt

   // Replace the static badge (around line 444):
   // OLD:
   // <Badge variant="default" className="bg-green-600 hover:bg-green-700 w-fit">
   //   🟢 Live Data
   // </Badge>

   // NEW:
   <ConnectionStatusIndicator
     restDataUpdatedAt={dataUpdatedAt}
     sourceType="oiHeatmap"
   />
   ```

2. Add freshness indicator to analytics cards:
   ```tsx
   // In analytics cards section, add freshness badge to each card
   {analytics && (
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
       {/* Net Bias Card */}
       <Card className={...}>
         <CardContent className="pt-6">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
               <Activity className="h-4 w-4" />
               Net OI Bias (24h)
             </div>
             <DataFreshnessBadge
               dataUpdatedAt={dataUpdatedAt || Date.now()}
               sourceType="oiHeatmap"
               variant="dot"
             />
           </div>
           {/* ... rest of card content */}
         </CardContent>
       </Card>
       {/* ... other cards with same pattern */}
     </div>
   )}
   ```

**Acceptance Criteria:**
- Dashboard shows live connection status in header
- Heatmap page's "Live Data" badge becomes dynamic
- No breaking layout changes; indicators fit existing design
- Status indicators visible on mobile (responsive)
- Health derived from actual TanStack Query `dataUpdatedAt` timestamps

**Test Requirements:**
- E2E test: connection status indicator visible on dashboard load
- E2E test: stale state appears when data stops updating (simulated via mocking)

---

### Task 6: Add unit tests for reconnection, event-driven health, and hybrid staleness

**File:** `__tests__/features/websocket-reconnection.test.ts` (new)

**Test cases:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketManager } from '@/lib/websocket/manager'

describe('WebSocket reconnection logic', () => {
  let manager: WebSocketManager

  beforeEach(() => {
    manager = new WebSocketManager()
    vi.useFakeTimers()
  })

  afterEach(() => {
    manager.disconnect()
    vi.useRealTimers()
  })

  it('calculates exponential backoff correctly', () => {
    // Test: attempt 1 = 1s, attempt 2 = 2s, attempt 3 = 4s, etc.
    // Access private method via reflection or test public behavior
    // For now, test observable behavior
  })

  it('caps reconnection delay at maximum', () => {
    // Test: delay never exceeds maxReconnectDelay (30s)
  })

  it('adds jitter to prevent thundering herd', () => {
    // Test: delay is within ±20% of base
  })

  it('resets reconnection counter on successful connection', () => {
    // Test: reconnectAttempts = 0 after onopen
  })

  it('stops reconnecting after max attempts', () => {
    // Test: no further connect() calls after maxReconnectAttempts
  })

  it('prevents duplicate connections with isReconnecting guard', () => {
    // Test: calling connect() while reconnecting is a no-op
  })
})

describe('Event-driven health subscription', () => {
  it('calls callback immediately on subscribe', () => {
    const callback = vi.fn()
    const manager = new WebSocketManager()

    manager.subscribeHealth(callback)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.any(String),
      lastMessageTime: expect.any(Number)
    }))
  })

  it('emits health on state changes', () => {
    const callback = vi.fn()
    const manager = new WebSocketManager()

    manager.subscribeHealth(callback)
    callback.mockClear() // Clear initial call

    // Simulate state change (would normally happen via WebSocket events)
    // Test that callback is invoked

    expect(callback).toHaveBeenCalled()
  })

  it('unsubscribes correctly', () => {
    const callback = vi.fn()
    const manager = new WebSocketManager()

    const unsubscribe = manager.subscribeHealth(callback)
    unsubscribe()

    callback.mockClear()

    // Trigger state change
    // Callback should NOT be called

    expect(callback).not.toHaveBeenCalled()
  })

  it('handles subscription errors gracefully', () => {
    // Test that errors in one callback don't affect others
  })
})

describe('Data freshness calculation', () => {
  it('returns fresh for recent messages', () => {
    // Test: age < staleThreshold → fresh
  })

  it('returns stale for old messages', () => {
    // Test: staleThreshold < age < criticalThreshold → stale
  })

  it('returns disconnected for very old messages', () => {
    // Test: age > criticalThreshold → disconnected
  })

  it('handles clock skew gracefully', () => {
    // Test: negative age → fresh (don't show stale on clock skew)
  })

  it('respects per-data-type thresholds', () => {
    // Test: orderbookDepth (5s) vs fundingRate (60s)
  })
})
```

**Acceptance Criteria:**
- All reconnection logic tests pass
- All event-driven health subscription tests pass
- All freshness calculation tests pass
- Coverage report shows >80% for new modules

---

### Task 7: Add E2E test for WS-down-but-REST-up scenario

**File:** `e2e/websocket-resilience.spec.ts` (new)

**Test cases:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('WebSocket Resilience', () => {
  test('displays connection status indicator on dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Initially shows LIVE (green) if data is fresh
    await expect(page.getByText('LIVE')).toBeVisible()
  })

  test('shows stale state when REST data stops updating', async ({ page }) => {
    // Mock heatmap API to return data with old timestamp
    await page.route('**/api/heatmap/oi**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            // ... valid heatmap data structure
            // The key is we control when this data is "old"
          }
        })
      })
    })

    await page.goto('/heatmap/oi')

    // Should show LIVE initially
    await expect(page.getByText('LIVE')).toBeVisible()

    // Simulate data aging by not updating
    // In real scenario, this would happen when API stops responding
    // For test, we can mock TanStack Query's dataUpdatedAt
  })

  test('WS-down-but-REST-up shows REST health', async ({ page }) => {
    // This is the CRITICAL test from Critic feedback
    // Scenario: WebSocket is disconnected but REST API is returning fresh data

    // Block WebSocket connections
    await page.route('**/stream**', route => route.abort())

    // Allow REST API to succeed
    await page.route('**/api/heatmap/oi**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cells: [],
            priceBuckets: [],
            timeBuckets: []
          }
        })
      })
    })

    await page.goto('/heatmap/oi')

    // Should NOT show OFFLINE (because REST is working)
    // Should show LIVE (green) based on REST data freshness
    await expect(page.getByText('LIVE')).toBeVisible()

    // Should NOT see WS-specific error states
    await expect(page.getByText('WebSocket')).not.toBeVisible()
  })

  test('per-data-type thresholds work correctly', async ({ page }) => {
    // Orderbook should go stale faster (5s) than funding rate (60s)

    // Mock orderbook endpoint
    await page.route('**/api/market/depth**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { /* orderbook data */ }
        })
      })
    })

    // Navigate to page with orderbook
    // After 6 seconds, should show STALE for orderbook but LIVE for other data
  })
})
```

**Acceptance Criteria:**
- E2E test runs in CI without external WebSocket dependency
- Mocked API responses simulate stale data scenarios
- WS-down-but-REST-up scenario correctly shows REST-based health
- Test passes with current Playwright configuration

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `lib/websocket/manager.ts` | Modify | Add event-driven `subscribeHealth()`, `isReconnecting` guard, bounded backoff, health emission |
| `lib/websocket/types.ts` | Create | ConnectionState, DataFreshness, WebSocketHealth, DataSourceConfig, per-data-type thresholds |
| `lib/websocket/freshness.ts` | Create | calculateFreshness, getFreshnessColor, getFreshnessLabel, getThresholdForDataSource |
| `lib/websocket/index.ts` | Create | Re-export all WebSocket module exports |
| `lib/hooks/useDataHealth.ts` | Create | Unified `useDataHealth` hook (REST + WS aggregation), `useQueryHealth` convenience hook |
| `components/ui/connection-status.tsx` | Create | ConnectionStatusIndicator, DataFreshnessBadge |
| `app/dashboard/page.tsx` | Modify | Add ConnectionStatusIndicator to header using TanStack Query `dataUpdatedAt` |
| `app/heatmap/oi/page.tsx` | Modify | Replace static badge with dynamic ConnectionStatusIndicator |
| `__tests__/features/websocket-reconnection.test.ts` | Create | Unit tests for reconnection, event-driven health, reconnect guard, thresholds |
| `e2e/websocket-resilience.spec.ts` | Create | E2E test for WS-down-but-REST-up scenario |

---

## Success Criteria

### Functional
- [ ] WebSocketManager uses bounded exponential backoff (1s → ... → 30s cap)
- [ ] Reconnection stops after max attempts (configurable, default 10)
- [ ] `isReconnecting` guard prevents duplicate connections
- [ ] `subscribeHealth()` emits immediately on subscribe and on every state change
- [ ] `useDataHealth` correctly aggregates REST (TanStack Query) and WebSocket health
- [ ] Per-data-type thresholds match existing `staleTime` values
- [ ] UI shows three distinct states: fresh (green/LIVE), stale (yellow/STALE), disconnected (red/OFFLINE)
- [ ] Dashboard and heatmap pages display connection status derived from actual data freshness
- [ ] WS-down-but-REST-up scenario shows REST-based health (not false "STALE")

### Quality
- [ ] All unit tests pass (`npm test -- --run`)
- [ ] E2E smoke test passes (`npm run test:e2e`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)

### Compliance
- [ ] No breaking changes to existing hook APIs
- [ ] No new dependencies on `archived/` directory
- [ ] All timestamps UTC milliseconds
- [ ] No fabricated market data
- [ ] No polling-based health checks (event-driven only)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket reconnection changes affect existing consumers | HIGH | Backward-compatible API; changes are additive only |
| Event-driven subscription pattern is new to codebase | MEDIUM | Clear documentation; simple pub/sub pattern |
| Hybrid health logic has edge cases | MEDIUM | Comprehensive unit tests; E2E test for WS-down/REST-up |
| E2E tests flaky due to timing | LOW | Use mocked responses; avoid real WebSocket dependency |
| UI layout shifts on new indicators | LOW | Use fixed-width badges; test on mobile |
| Clock skew causes incorrect staleness | LOW | Treat negative age as fresh; use UTC only |
| Per-data-type thresholds may need tuning | LOW | Derived from existing `staleTime` values; configurable |

---

## Dependencies

**Blocks:** None (this is the next Tranche in Phase 0)

**Blocked by:**
- Phase 0 Tranche A completion (tooling baseline in place)

**Related tranches:**
- Tranche C (Binance client consolidation) — will use similar error-model patterns
- Tranche D (Coverage) — may expand test coverage for WebSocket modules

---

## Open Questions

1. **Per-data-type threshold configuration:** Should thresholds be environment variables or constants?
   - **Decision:** Constants derived from existing `staleTime` values in `useMarketData.ts`. Environment variables considered in Tranche C if needed.

2. **Manual reconnect button:** Should Tranche B include UI-triggered reconnect?
   - **Decision:** No; keep scope to status display only. Manual reconnect is feature work for Phase 1.

3. **Global vs per-stream staleness:** Should staleness be tracked per WebSocket stream or globally?
   - **Decision:** Global staleness for WS manager (all streams share same manager). REST data is tracked per-query via TanStack Query. Per-stream staleness is enhancement for Phase 1.

4. **Subscription to WebSocketManager:** Should components directly subscribe to WS or use `useDataHealth`?
   - **Decision:** Use `useDataHealth` hook for consistency. Direct `subscribeHealth()` is available for advanced use cases.

---

## ADR (Architecture Decision Record)

### Decision
Implement WebSocket resilience with event-driven health subscription (`subscribeHealth()`), reconnect guard (`isReconnecting`), and unified `useDataHealth` hook that aggregates REST (TanStack Query) and WebSocket health with per-data-type staleness thresholds.

### Drivers
1. **Tranche B acceptance criteria** require visible fresh/stale/disconnected states
2. Current `WebSocketManager` has unbounded reconnection (5 attempts only) and no staleness tracking
3. Dashboard/heatmap use REST (TanStack Query) but specialized streams use WebSocket
4. Users cannot determine if displayed data is current or stale
5. Critic feedback: original plan tracked WS health for REST data (architectural mismatch)
6. Critic feedback: TOCTOU gap from polling-based health checks
7. Critic feedback: missing reconnect guard causes race condition

### Alternatives Considered
1. **Option A (chosen):** Event-driven WS health + unified `useDataHealth` hook
2. **Option B:** Separate health hooks for REST and WebSocket
3. **Option C:** Global health context provider

### Why Option A Chosen
- Event-driven `subscribeHealth()` eliminates TOCTOU gap
- `isReconnecting` guard prevents race condition
- Unified `useDataHealth` correctly handles hybrid architecture (REST + WS)
- Per-data-type thresholds derived from actual `staleTime` values
- Minimal blast radius aligns with Phase 0 "keep diffs small"
- Preserves backward compatibility

### Consequences
**Positive:**
- Clear connection state visible in UI
- Bounded reconnection prevents resource leaks
- Correct health display for both REST and WebSocket data
- Foundation for future connection UI (manual reconnect, per-stream status)
- Zero TOCTOU gap with event-driven subscriptions

**Negative:**
- Slightly more complex hook due to hybrid nature
- Requires new subscription mechanism in WebSocketManager
- One-time learning curve for event-driven health pattern

### Follow-ups
- Consider Context-based health state if multiple pages need centralized status (Phase 1)
- Add per-stream staleness if multi-stream subscriptions grow (Phase 1)
- Document threshold tuning in operations guide
- Consider health aggregation across multiple data sources for composite "system health" (Phase 2)

---

## References

- `PHASE-0-TEST-SPEC.md` — Tranche B acceptance criteria
- `PHASE-0-FOUNDATION-HARDENING.md` — Overall Phase 0 scope
- `AGENTS.md` — Project constraints (read-only, no fabricated data)
- `docs/OI-MOMENTUM-GUIDE.md` — Example of real-time feature requirements

---

**End of Revised Plan (Iteration 1)**
