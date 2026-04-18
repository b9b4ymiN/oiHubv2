import { NextRequest, NextResponse } from 'next/server'
import { VALID_SYMBOLS, VALID_INTERVALS } from '@/lib/backtest/types/config'
import { getStrategyRegistry } from '@/lib/backtest/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateRequest {
  strategyId: string
  strategyParams?: Record<string, unknown>
  symbol: string
  interval: string
  initialCapital: number
  fillModel?: {
    slippageModel?: 'none' | 'fixed' | 'percentage' | 'adaptive'
    slippageValue?: number
    feeModel?: 'none' | 'binance-futures'
    makerFee?: number
    takerFee?: number
    enableFunding?: boolean
    enableLiquidationCascade?: boolean
    enableDowntimeGaps?: boolean
    leverage?: number
  }
}

interface ErrorResponse {
  error: string
  details?: string[]
}

// GET /api/paper-trading — list all sessions
export async function GET() {
  const { getAllSessions } = await import('@/lib/paper-trading/engine')
  const sessions = getAllSessions()
  return NextResponse.json({ sessions })
}

// POST /api/paper-trading — create new session
export async function POST(request: NextRequest) {
  try {
    const body: CreateRequest = await request.json()

    const errors: string[] = []

    // Validate strategy
    if (!body.strategyId) {
      errors.push('strategyId is required')
    } else {
      try {
        getStrategyRegistry().get(body.strategyId)
      } catch {
        errors.push(`Invalid strategy: ${body.strategyId}`)
      }
    }

    // Validate symbol
    if (!body.symbol) {
      errors.push('symbol is required')
    } else if (!VALID_SYMBOLS.includes(body.symbol as any)) {
      errors.push(`symbol must be one of: ${VALID_SYMBOLS.join(', ')}`)
    }

    // Validate interval
    if (!body.interval) {
      errors.push('interval is required')
    } else if (!VALID_INTERVALS.includes(body.interval as any)) {
      errors.push(`interval must be one of: ${VALID_INTERVALS.join(', ')}`)
    }

    // Validate initial capital
    if (!body.initialCapital || body.initialCapital <= 0) {
      errors.push('initialCapital must be greater than 0')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid config', details: errors },
        { status: 400 }
      )
    }

    const { createSession } = await import('@/lib/paper-trading/engine')
    const session = createSession({
      strategyId: body.strategyId,
      strategyParams: body.strategyParams || {},
      symbol: body.symbol,
      interval: body.interval,
      initialCapital: body.initialCapital,
      fillModel: body.fillModel || {},
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    )
  }
}
