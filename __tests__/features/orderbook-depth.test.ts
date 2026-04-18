import { describe, expect, it } from 'vitest'

import {
  analyzeOrderbookDepth,
  classifyLiquidityState,
} from '@/lib/features/orderbook-depth'
import type { OrderbookData } from '@/lib/features/orderbook-depth'

describe('Orderbook Depth Analysis', () => {
  describe('analyzeOrderbookDepth', () => {
    it('returns basic analysis for minimal valid orderbook', () => {
      const orderbook: OrderbookData = {
        bids: [{ price: 90000, quantity: 100 }],
        asks: [{ price: 90100, quantity: 100 }],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bestBid).toBe(90000)
      expect(analysis.bestAsk).toBe(90100)
      expect(analysis.midPrice).toBe(90050)
      expect(analysis.bids).toHaveLength(1)
      expect(analysis.asks).toHaveLength(1)
    })

    it('calculates cumulative depth correctly', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 200 },
          { price: 89800, quantity: 150 },
        ],
        asks: [
          { price: 90100, quantity: 120 },
          { price: 90200, quantity: 180 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bids[0]?.cumulative).toBe(100)
      expect(analysis.bids[1]?.cumulative).toBe(300)
      expect(analysis.bids[2]?.cumulative).toBe(450)
      expect(analysis.asks[0]?.cumulative).toBe(120)
      expect(analysis.asks[1]?.cumulative).toBe(300)
    })

    it('calculates spread and spread percentage correctly', () => {
      const orderbook: OrderbookData = {
        bids: [{ price: 90000, quantity: 100 }],
        asks: [{ price: 90100, quantity: 100 }],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.metrics.spread).toBe(100)
      expect(analysis.metrics.spreadPercent).toBeCloseTo(0.1111, 3)
    })

    it('calculates liquidity metrics correctly', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 200 },
        ],
        asks: [
          { price: 90100, quantity: 150 },
          { price: 90200, quantity: 100 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.metrics.bidLiquidity).toBe(300)
      expect(analysis.metrics.askLiquidity).toBe(250)
      expect(analysis.metrics.imbalance).toBe(50)
      expect(analysis.metrics.imbalancePercent).toBeCloseTo(9.09, 2)
    })

    it('identifies top liquidity walls', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 500 }, // Largest bid
          { price: 89900, quantity: 100 },
          { price: 89800, quantity: 200 },
        ],
        asks: [
          { price: 90100, quantity: 600 }, // Largest ask
          { price: 90200, quantity: 150 },
          { price: 90300, quantity: 100 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.topWalls).toHaveLength(5)
      expect(analysis.topWalls[0]?.quantity).toBe(600) // Largest ask
      expect(analysis.topWalls[0]?.rank).toBe(1)
      expect(analysis.topWalls[0]?.side).toBe('ASK')
    })

    it('calculates slippage estimates for different order sizes', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 0.5 }, // ~$45k
          { price: 89900, quantity: 0.5 }, // ~$45k
        ],
        asks: [
          { price: 90100, quantity: 0.5 },
          { price: 90200, quantity: 0.5 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.metrics.slippageEstimates.size10k).toBeDefined()
      expect(analysis.metrics.slippageEstimates.size50k).toBeDefined()
      expect(analysis.metrics.slippageEstimates.size100k).toBeDefined()

      // 10k order should have minimal slippage
      expect(analysis.metrics.slippageEstimates.size10k.bid).toBeLessThan(0.01)
      expect(analysis.metrics.slippageEstimates.size10k.ask).toBeLessThan(0.01)
    })

    it('respects depthLevels parameter', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 100 },
          { price: 89800, quantity: 100 },
          { price: 89700, quantity: 100 },
          { price: 89600, quantity: 100 },
        ],
        asks: [
          { price: 90100, quantity: 100 },
          { price: 90200, quantity: 100 },
          { price: 90300, quantity: 100 },
          { price: 90400, quantity: 100 },
          { price: 90500, quantity: 100 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook, 3)

      expect(analysis.bids).toHaveLength(3)
      expect(analysis.asks).toHaveLength(3)
    })

    it('handles empty orderbook gracefully', () => {
      const orderbook: OrderbookData = {
        bids: [],
        asks: [],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bestBid).toBe(0)
      expect(analysis.bestAsk).toBe(0)
      expect(analysis.midPrice).toBe(0)
      expect(analysis.bids).toHaveLength(0)
      expect(analysis.asks).toHaveLength(0)
    })

    it('handles only bids scenario', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 200 },
        ],
        asks: [],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bestBid).toBe(90000)
      expect(analysis.bestAsk).toBe(0)
      expect(analysis.metrics.bidLiquidity).toBe(300)
      expect(analysis.metrics.askLiquidity).toBe(0)
      expect(analysis.metrics.imbalance).toBe(300)
    })

    it('handles only asks scenario', () => {
      const orderbook: OrderbookData = {
        bids: [],
        asks: [
          { price: 90100, quantity: 150 },
          { price: 90200, quantity: 100 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bestBid).toBe(0)
      expect(analysis.bestAsk).toBe(90100)
      expect(analysis.metrics.bidLiquidity).toBe(0)
      expect(analysis.metrics.askLiquidity).toBe(250)
      expect(analysis.metrics.imbalance).toBe(-250)
    })

    it('calculates correct wall percentages', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 300 },
        ],
        asks: [
          { price: 90100, quantity: 200 },
          { price: 90200, quantity: 400 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      const bidWall = analysis.topWalls.find(w => w.side === 'BID' && w.price === 89900)
      expect(bidWall?.percentOfTotal).toBeCloseTo(75, 1) // 300/400

      const askWall = analysis.topWalls.find(w => w.side === 'ASK' && w.price === 90200)
      expect(askWall?.percentOfTotal).toBeCloseTo(66.67, 1) // 400/600
    })

    it('handles single data point scenario', () => {
      const orderbook: OrderbookData = {
        bids: [{ price: 90000, quantity: 100 }],
        asks: [{ price: 90100, quantity: 100 }],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.bids[0]?.cumulative).toBe(100)
      expect(analysis.asks[0]?.cumulative).toBe(100)
      expect(analysis.metrics.bidLiquidity).toBe(100)
      expect(analysis.metrics.askLiquidity).toBe(100)
    })

    it('calculates imbalance correctly for balanced orderbook', () => {
      const orderbook: OrderbookData = {
        bids: [
          { price: 90000, quantity: 100 },
          { price: 89900, quantity: 100 },
        ],
        asks: [
          { price: 90100, quantity: 100 },
          { price: 90200, quantity: 100 },
        ],
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook)

      expect(analysis.metrics.bidLiquidity).toBe(200)
      expect(analysis.metrics.askLiquidity).toBe(200)
      expect(analysis.metrics.imbalance).toBe(0)
      expect(analysis.metrics.imbalancePercent).toBe(0)
    })

    it('calculates cumulative depth correctly for large orderbook', () => {
      const levels = 20
      const bids = []
      const asks = []

      for (let i = 0; i < levels; i++) {
        bids.push({ price: 90000 - i * 100, quantity: 100 + i * 10 })
        asks.push({ price: 90100 + i * 100, quantity: 100 + i * 10 })
      }

      const orderbook: OrderbookData = {
        bids,
        asks,
        lastUpdateId: 1,
        timestamp: Date.now(),
      }

      const analysis = analyzeOrderbookDepth(orderbook, levels)

      expect(analysis.bids).toHaveLength(levels)
      expect(analysis.asks).toHaveLength(levels)
      expect(analysis.bids[levels - 1]?.cumulative).toBeGreaterThan(
        analysis.bids[0]?.cumulative || 0
      )
      expect(analysis.asks[levels - 1]?.cumulative).toBeGreaterThan(
        analysis.asks[0]?.cumulative || 0
      )
    })
  })

  describe('classifyLiquidityState', () => {
    it('classifies THIN for wide spread', () => {
      const metrics = {
        spread: 200, // $200 spread on $90k = ~0.22%
        spreadPercent: 0.22,
        bidLiquidity: 1000,
        askLiquidity: 1000,
        imbalance: 0,
        imbalancePercent: 0,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THIN')
      expect(result.risk).toBe('HIGH')
      expect(result.description).toBe('Thin liquidity - High slippage risk')
    })

    it('classifies THIN for low total liquidity', () => {
      const metrics = {
        spread: 10,
        spreadPercent: 0.01,
        bidLiquidity: 40,
        askLiquidity: 40,
        imbalance: 0,
        imbalancePercent: 0,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THIN')
      expect(result.risk).toBe('HIGH')
    })

    it('classifies THICK_BID for bid dominance', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 1000,
        askLiquidity: 500,
        imbalance: 500,
        imbalancePercent: 33.33,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THICK_BID')
      expect(result.risk).toBe('LOW')
      expect(result.description).toBe('Bid side dominant - Strong support')
    })

    it('classifies THICK_ASK for ask dominance', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 500,
        askLiquidity: 1000,
        imbalance: -500,
        imbalancePercent: -33.33,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THICK_ASK')
      expect(result.risk).toBe('LOW')
      expect(result.description).toBe('Ask side dominant - Strong resistance')
    })

    it('classifies BALANCED for neutral conditions', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 1000,
        askLiquidity: 1100,
        imbalance: -100,
        imbalancePercent: -4.76,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('BALANCED')
      expect(result.risk).toBe('MEDIUM')
      expect(result.description).toBe('Balanced orderbook - Normal conditions')
    })

    it('handles edge case at imbalance threshold (+20%)', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 1200,
        askLiquidity: 800,
        imbalance: 400,
        imbalancePercent: 20,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      // Implementation checks > 20, not >= 20
      expect(result.state).toBe('BALANCED')
    })

    it('handles edge case at imbalance threshold (-20%)', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 800,
        askLiquidity: 1200,
        imbalance: -400,
        imbalancePercent: -20,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      // Implementation checks < -20, not <= -20
      expect(result.state).toBe('BALANCED')
    })

    it('handles edge case at spread threshold (0.1%)', () => {
      const metrics = {
        spread: 90,
        spreadPercent: 0.1,
        bidLiquidity: 1000,
        askLiquidity: 1000,
        imbalance: 0,
        imbalancePercent: 0,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      // Implementation checks > 0.1, not >= 0.1
      expect(result.state).toBe('BALANCED')
    })

    it('handles extreme imbalance scenario', () => {
      const metrics = {
        spread: 50,
        spreadPercent: 0.05,
        bidLiquidity: 5000,
        askLiquidity: 500,
        imbalance: 4500,
        imbalancePercent: 81.82,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THICK_BID')
      expect(result.risk).toBe('LOW')
    })

    it('handles edge case with zero liquidity', () => {
      const metrics = {
        spread: 0,
        spreadPercent: 0,
        bidLiquidity: 0,
        askLiquidity: 0,
        imbalance: 0,
        imbalancePercent: 0,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THIN')
      expect(result.risk).toBe('HIGH')
    })

    it('handles single side with zero other side', () => {
      const metrics = {
        spread: 100,
        spreadPercent: 0.05,
        bidLiquidity: 1000,
        askLiquidity: 0,
        imbalance: 1000,
        imbalancePercent: 100,
        slippageEstimates: {
          size10k: { bid: 0, ask: 0 },
          size50k: { bid: 0, ask: 0 },
          size100k: { bid: 0, ask: 0 },
        },
      }

      const result = classifyLiquidityState(metrics)

      expect(result.state).toBe('THICK_BID')
      expect(result.risk).toBe('LOW')
    })
  })
})
