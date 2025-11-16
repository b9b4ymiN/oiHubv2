// lib/websocket/manager.ts

type StreamCallback = (data: any) => void

export class WebSocketManager {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, Set<StreamCallback>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com'
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    const streams = Array.from(this.subscriptions.keys()).join('/')
    if (!streams) return

    const url = `${this.baseUrl}/stream?streams=${streams}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.stream && message.data) {
            const callbacks = this.subscriptions.get(message.stream)
            if (callbacks) {
              callbacks.forEach(callback => callback(message.data))
            }
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket closed')
        this.handleReconnect()
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

      setTimeout(() => {
        this.connect()
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
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
