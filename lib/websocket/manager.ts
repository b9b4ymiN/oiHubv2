// lib/websocket/manager.ts

import type { WebSocketHealth, ConnectionState } from './types'
import logger from '@/lib/logger'

type StreamCallback = (data: any) => void
type HealthCallback = (health: WebSocketHealth) => void

export class WebSocketManager {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, Set<StreamCallback>>()
  private reconnectAttempts = 0
  private reconnectDelay = 1000
  private baseUrl: string

  // Health tracking properties
  private lastMessageTime = Date.now()
  private connectionState: ConnectionState = 'disconnected'
  private maxReconnectDelay = 30000
  private maxReconnectAttempts = 10
  private isReconnecting = false
  private healthSubscribers = new Set<HealthCallback>()

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com'
  }

  private connect() {
    // Reconnect guard: prevent multiple simultaneous connection attempts
    if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
      return
    }

    this.isReconnecting = true
    this.connectionState = 'connecting'
    this.emitHealth()

    const streams = Array.from(this.subscriptions.keys()).join('/')
    if (!streams) return

    const url = `${this.baseUrl}/stream?streams=${streams}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        logger.info('WebSocket connected')
        this.connectionState = 'connected'
        this.isReconnecting = false
        this.reconnectAttempts = 0
        this.emitHealth()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.stream && message.data) {
            this.lastMessageTime = Date.now()
            const callbacks = this.subscriptions.get(message.stream)
            if (callbacks) {
              callbacks.forEach(callback => callback(message.data))
            }
            this.emitHealth()
          }
        } catch (error) {
          logger.error({ error }, 'WebSocket message parse error')
        }
      }

      this.ws.onerror = (error) => {
        logger.error({ error }, 'WebSocket error')
        this.emitHealth()
      }

      this.ws.onclose = () => {
        logger.info('WebSocket closed')
        this.connectionState = 'disconnected'
        this.emitHealth()
        this.handleReconnect()
      }
    } catch (error) {
      logger.error({ error }, 'WebSocket connection error')
      this.isReconnecting = false
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    this.isReconnecting = false

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.connectionState = 'reconnecting'
      this.emitHealth()

      const delay = this.getNextReconnectDelay()
      logger.info({ delay, attempt: this.reconnectAttempts }, 'Reconnecting')

      setTimeout(() => {
        this.connect()
      }, delay)
    } else {
      logger.error({ attempts: this.reconnectAttempts }, 'Max reconnection attempts reached')
      this.connectionState = 'disconnected'
      this.emitHealth()
    }
  }

  private getNextReconnectDelay(): number {
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    const cappedDelay = Math.min(baseDelay, this.maxReconnectDelay)
    // Add ±20% jitter
    const jitter = 0.8 + Math.random() * 0.4
    return Math.floor(cappedDelay * jitter)
  }

  subscribe(stream: string, callback: StreamCallback): () => void {
    if (!this.subscriptions.has(stream)) {
      this.subscriptions.set(stream, new Set())
      this.reconnect()
    }

    this.subscriptions.get(stream)?.add(callback)

    return () => this.unsubscribe(stream, callback)
  }

  unsubscribe(stream: string, callback: StreamCallback) {
    const callbacks = this.subscriptions.get(stream)
    if (callbacks) {
      callbacks.delete(callback)

      if (callbacks.size === 0) {
        this.subscriptions.delete(stream)
        this.reconnect()
      }
    }
  }

  private reconnect() {
    this.disconnect()
    if (this.subscriptions.size > 0) {
      this.connect()
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectionState = 'disconnected'
    this.isReconnecting = false
    this.emitHealth()
  }

  // Health management methods
  subscribeHealth(callback: HealthCallback): () => void {
    this.healthSubscribers.add(callback)
    // Immediately emit current health state
    callback(this.getHealth())
    return () => this.healthSubscribers.delete(callback)
  }

  private emitHealth() {
    const health = this.getHealth()
    this.healthSubscribers.forEach(callback => {
      try {
        callback(health)
      } catch (error) {
        logger.error({ error }, 'Health subscriber error')
      }
    })
  }

  getHealth(): WebSocketHealth {
    return {
      state: this.connectionState,
      lastMessageTime: this.lastMessageTime,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
    }
  }

  // Helper methods for common streams
  subscribeKline(symbol: string, interval: string, callback: StreamCallback) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`
    return this.subscribe(stream, callback)
  }

  subscribeAggTrade(symbol: string, callback: StreamCallback) {
    const stream = `${symbol.toLowerCase()}@aggTrade`
    return this.subscribe(stream, callback)
  }

  subscribeMarkPrice(symbol: string, callback: StreamCallback) {
    const stream = `${symbol.toLowerCase()}@markPrice`
    return this.subscribe(stream, callback)
  }

  subscribeLiquidations(symbol: string, callback: StreamCallback) {
    const stream = `${symbol.toLowerCase()}@forceOrder`
    return this.subscribe(stream, callback)
  }
}

export const wsManager = new WebSocketManager()
