import { describe, it, expect } from 'vitest'
import { buildSignalPayload, buildDailySummaryPayload } from '@/lib/signal-runner/alert-builder'
import type { PaperSession } from '@/lib/paper-trading/types'
import type { Bar } from '@/lib/backtest/types/strategy'

function makeSession(overrides?: Partial<PaperSession['config']>): PaperSession {
  return {
    config: {
      id: 'test-session-001',
      strategyId: 'signal-oi-momentum-vol',
      symbol: 'SOLUSDT',
      interval: '1h',
      initialCapital: 10000,
      strategyParams: {},
      fillModel: {
        slippageModel: 'percentage',
        slippageValue: 0.01,
        feeModel: 'binance-futures',
        makerFee: 0.0002,
        takerFee: 0.0005,
        enableFunding: true,
        enableLiquidationCascade: false,
        enableDowntimeGaps: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    },
    account: {
      equity: 10250,
      balance: 10000,
      realizedPnl: 250,
      unrealizedPnl: 0,
      margin: 0,
      maxDrawdown: 0.02,
      position: { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 },
    },
    trades: [],
    status: 'running',
    errors: [],
  }
}

function makeBar(overrides?: Partial<Bar>): Bar {
  return {
    timestamp: Date.now(),
    open: 150,
    high: 155,
    low: 148,
    close: 152,
    volume: 1000000,
    ...overrides,
  }
}

describe('buildSignalPayload', () => {
  it('builds LONG alert with correct color and fields', () => {
    const session = makeSession()
    const intent = { kind: 'enter_long' as const, size: 0.5, reason: 'OI momentum acceleration' }
    const bar = makeBar({ close: 152.50 })

    const payload = buildSignalPayload(session, intent, bar)

    expect(payload.embeds).toHaveLength(1)
    const embed = payload.embeds[0]!
    expect(embed.color).toBe(0x00FF00)
    expect(embed.title).toContain('signal-oi-momentum-vol')
    expect(embed.title).toContain('SOLUSDT 1h')
    expect((embed as Record<string, unknown>).description).toContain('LONG')
    expect((embed as Record<string, unknown>).description).toContain('152.50')
  })

  it('builds SHORT alert with red color', () => {
    const session = makeSession()
    const intent = { kind: 'enter_short' as const, size: 0.3, reason: 'OI exhaustion' }
    const bar = makeBar()

    const payload = buildSignalPayload(session, intent, bar)
    expect(payload.embeds[0]!.color).toBe(0xFF0000)
  })

  it('builds EXIT ALL alert with yellow color', () => {
    const session = makeSession()
    const intent = { kind: 'exit_all' as const, reason: 'Signal reversal' }
    const bar = makeBar()

    const payload = buildSignalPayload(session, intent, bar)
    expect(payload.embeds[0]!.color).toBe(0xFFAA00)
  })

  it('includes backtest metrics when provided', () => {
    const session = makeSession()
    const intent = { kind: 'enter_long' as const, size: 0.5, reason: 'test' }
    const bar = makeBar()
    const metrics = { winRate: 71.4, profitFactor: 10.25 }

    const payload = buildSignalPayload(session, intent, bar, metrics)
    const fields = (payload.embeds[0] as Record<string, unknown>).fields as Record<string, unknown>[]
    const fieldNames = fields.map(f => f.name)
    expect(fieldNames).toContain('Backtest WR')
    expect(fieldNames).toContain('Backtest PF')
  })

  it('includes stop loss when present', () => {
    const session = makeSession()
    const intent = { kind: 'enter_long' as const, size: 0.5, reason: 'test', stopLoss: 145.0 }
    const bar = makeBar()

    const payload = buildSignalPayload(session, intent, bar)
    const fields = (payload.embeds[0] as Record<string, unknown>).fields as Record<string, unknown>[]
    const fieldNames = fields.map(f => f.name)
    expect(fieldNames).toContain('Stop Loss')
  })

  it('uses session timestamp for embed', () => {
    const ts = 1700000000000
    const session = makeSession()
    const intent = { kind: 'enter_long' as const, size: 0.5, reason: 'test' }
    const bar = makeBar({ timestamp: ts })

    const payload = buildSignalPayload(session, intent, bar)
    expect(payload.embeds[0]!.timestamp).toBe(new Date(ts).toISOString())
  })
})

describe('buildDailySummaryPayload', () => {
  it('builds summary with correct field count', () => {
    const sessions = [makeSession(), makeSession({ id: 'sess2', symbol: 'ETHUSDT' })]
    const payload = buildDailySummaryPayload(sessions, '2026-04-19')

    expect(payload.embeds).toHaveLength(1)
    const embed = payload.embeds[0]!
    expect((embed as Record<string, unknown>).title).toBe('Daily Signal Summary')
    const fields = (embed as Record<string, unknown>).fields as Record<string, unknown>[]
    expect(fields.some(f => f.name === 'Date')).toBe(true)
    expect(fields.some(f => f.name === 'Sessions')).toBe(true)
  })

  it('shows green color for positive P&L', () => {
    const sessions = [makeSession()]
    const payload = buildDailySummaryPayload(sessions, '2026-04-19')
    expect(payload.embeds[0]!.color).toBe(0x00FF00)
  })

  it('shows red color for negative P&L', () => {
    const session = makeSession()
    session.account.realizedPnl = -100
    const payload = buildDailySummaryPayload([session], '2026-04-19')
    expect(payload.embeds[0]!.color).toBe(0xFF0000)
  })

  it('includes open positions when present', () => {
    const session = makeSession()
    session.account.position = { side: 'long', size: 0.5, entryPrice: 150, unrealizedPnl: 10 }
    const payload = buildDailySummaryPayload([session], '2026-04-19')
    const fields = (payload.embeds[0] as Record<string, unknown>).fields as Record<string, unknown>[]
    expect(fields.some(f => f.name === 'Open Positions')).toBe(true)
  })
})
