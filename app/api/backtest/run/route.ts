import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import type { BacktestConfig } from '@/lib/backtest/types/config'
import { VALID_SYMBOLS, VALID_INTERVALS, DEFAULT_FILL_MODEL } from '@/lib/backtest/types/config'
import { getBacktest, setBacktest, canStartNew, incrementRunning, decrementRunning } from '@/lib/backtest/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RunRequest {
  symbol: string
  interval: string
  startTime: number
  endTime: number
  strategyId: string
  strategyParams: Record<string, unknown>
  initialCapital: number
  seed?: number
  fillModel?: Partial<BacktestConfig['fillModel']>
}

interface ErrorResponse {
  error: string
  details?: string[]
}

interface RunResponse {
  backtestId: string
  status: 'running'
}

function validateConfig(config: RunRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate symbol
  if (!config.symbol) {
    errors.push('symbol is required')
  } else if (!VALID_SYMBOLS.includes(config.symbol as any)) {
    errors.push(`symbol must be one of: ${VALID_SYMBOLS.join(', ')}`)
  }

  // Validate interval
  if (!config.interval) {
    errors.push('interval is required')
  } else if (!VALID_INTERVALS.includes(config.interval as any)) {
    errors.push(`interval must be one of: ${VALID_INTERVALS.join(', ')}`)
  }

  // Validate time range
  if (!config.startTime) {
    errors.push('startTime is required')
  }
  if (!config.endTime) {
    errors.push('endTime is required')
  } else if (config.startTime && config.endTime <= config.startTime) {
    errors.push('endTime must be greater than startTime')
  }

  // Validate initial capital
  if (config.initialCapital === undefined) {
    errors.push('initialCapital is required')
  } else if (config.initialCapital <= 0) {
    errors.push('initialCapital must be greater than 0')
  }

  // Validate strategy
  if (!config.strategyId) {
    errors.push('strategyId is required')
  }

  // Validate seed if provided
  if (config.seed !== undefined && typeof config.seed !== 'number') {
    errors.push('seed must be a number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<RunResponse | ErrorResponse>> {
  try {
    // Parse request body
    const body: RunRequest = await request.json()

    // Validate configuration
    const validation = validateConfig(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid backtest configuration', details: validation.errors },
        { status: 400 }
      )
    }

    // Check if we can start a new backtest
    if (!canStartNew()) {
      return NextResponse.json(
        { error: 'Too many concurrent backtests running. Please try again later.' },
        { status: 429 }
      )
    }

    // Generate backtest ID
    const backtestId = randomUUID()
    const now = Date.now()

    // Build full config with defaults
    const fullConfig: BacktestConfig = {
      symbol: body.symbol,
      interval: body.interval,
      startTime: body.startTime,
      endTime: body.endTime,
      strategyId: body.strategyId,
      strategyParams: body.strategyParams || {},
      initialCapital: body.initialCapital,
      seed: body.seed ?? Math.floor(Math.random() * 2 ** 31),
      fillModel: {
        ...DEFAULT_FILL_MODEL,
        ...body.fillModel,
      },
    }

    // Create backtest entry in store
    setBacktest(backtestId, {
      id: backtestId,
      status: 'running',
      progress: 0,
      startedAt: now,
    })

    // Increment running counter
    incrementRunning()

    // Run backtest asynchronously (lazy-load to avoid DuckDB at build time)
    ;(async () => {
      try {
        const { runBacktest } = await import('@/lib/backtest/event-loop')
        const result = await runBacktest(fullConfig)
        const entry = getBacktest(backtestId)
        if (entry) {
          setBacktest(backtestId, {
            ...entry,
            status: 'completed',
            progress: 100,
            result,
            completedAt: Date.now(),
          })
        }
      } catch (error) {
        const entry = getBacktest(backtestId)
        if (entry) {
          setBacktest(backtestId, {
            ...entry,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: Date.now(),
          })
        }
      } finally {
        decrementRunning()
      }
    })()

    // Return immediately with backtest ID
    return NextResponse.json(
      {
        backtestId,
        status: 'running',
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to start backtest',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    )
  }
}
