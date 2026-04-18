import { NextResponse } from 'next/server'
import { getStrategyRegistry } from '@/lib/backtest/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/backtest/strategies — list all available strategies
export async function GET() {
  const registry = getStrategyRegistry()
  const strategies = registry.listStrategies()
  return NextResponse.json({ strategies })
}
