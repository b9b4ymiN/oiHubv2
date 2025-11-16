'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiquidityMetrics } from '@/lib/features/orderbook-depth'
import { formatNumber, formatPrice } from '@/lib/utils/data'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface LiquidityMetricsPanelProps {
  metrics: LiquidityMetrics
  midPrice: number
}

export function LiquidityMetricsPanel({ metrics, midPrice }: LiquidityMetricsPanelProps) {
  const {
    spread,
    spreadPercent,
    bidLiquidity,
    askLiquidity,
    imbalancePercent,
    slippageEstimates
  } = metrics

  // Determine market state
  const marketState = useMemo(() => {
    if (spreadPercent > 0.1) {
      return { label: 'Wide Spread', color: 'destructive' as const, risk: 'HIGH' }
    } else if (spreadPercent > 0.05) {
      return { label: 'Normal', color: 'secondary' as const, risk: 'MEDIUM' }
    } else {
      return { label: 'Tight Spread', color: 'default' as const, risk: 'LOW' }
    }
  }, [spreadPercent])

  // Determine bias
  const bias = useMemo(() => {
    if (imbalancePercent > 20) {
      return { label: 'Buyer Dominant', color: 'text-green-500', value: imbalancePercent }
    } else if (imbalancePercent < -20) {
      return { label: 'Seller Dominant', color: 'text-red-500', value: Math.abs(imbalancePercent) }
    } else {
      return { label: 'Balanced', color: 'text-muted-foreground', value: Math.abs(imbalancePercent) }
    }
  }, [imbalancePercent])

  // Calculate progress bar value (0-100 scale)
  // imbalancePercent is -100 to +100, we need 0-100 for progress bar
  const progressValue = ((imbalancePercent + 100) / 2)

  return (
    <div className="space-y-4">
      {/* Spread & Market State */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Spread & Liquidity</span>
            <Badge variant={marketState.color}>{marketState.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Spread</div>
              <div className="font-mono text-lg font-semibold">
                ${formatPrice(spread, 2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {spreadPercent.toFixed(3)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Mid Price</div>
              <div className="font-mono text-lg font-semibold">
                ${formatPrice(midPrice, 2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Bid Liquidity</div>
              <div className="font-mono text-sm text-green-500">
                {formatNumber(bidLiquidity)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ask Liquidity</div>
              <div className="font-mono text-sm text-red-500">
                {formatNumber(askLiquidity)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Imbalance Gauge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Orderbook Bias</span>
            <span className={`text-sm ${bias.color}`}>
              {bias.label}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-500">SELL</span>
              <span className="font-mono text-sm font-semibold">
                {imbalancePercent > 0 ? '+' : ''}{imbalancePercent.toFixed(1)}%
              </span>
              <span className="text-green-500">BUY</span>
            </div>

            <div className="relative h-2 bg-gradient-to-r from-red-500 via-muted to-green-500 rounded-full">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white border-2 border-purple-500 rounded-full"
                style={{ left: `${progressValue}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-1">
            {imbalancePercent > 20 && 'Strong buying pressure - potential support'}
            {imbalancePercent < -20 && 'Strong selling pressure - potential resistance'}
            {Math.abs(imbalancePercent) <= 20 && 'Balanced orderbook - neutral conditions'}
          </div>
        </CardContent>
      </Card>

      {/* Slippage Estimates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Slippage Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SlippageRow
              size="10k"
              bidSlippage={slippageEstimates.size10k.bid}
              askSlippage={slippageEstimates.size10k.ask}
            />
            <SlippageRow
              size="50k"
              bidSlippage={slippageEstimates.size50k.bid}
              askSlippage={slippageEstimates.size50k.ask}
            />
            <SlippageRow
              size="100k"
              bidSlippage={slippageEstimates.size100k.bid}
              askSlippage={slippageEstimates.size100k.ask}
            />
          </div>

          <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Estimated slippage for market orders (USDT notional value)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SlippageRow({
  size,
  bidSlippage,
  askSlippage
}: {
  size: string
  bidSlippage: number
  askSlippage: number
}) {
  const getSlippageColor = (slippage: number) => {
    const abs = Math.abs(slippage)
    if (abs < 0.1) return 'text-green-500'
    if (abs < 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="grid grid-cols-3 gap-4 items-center text-sm">
      <div className="font-semibold text-muted-foreground">${size}</div>
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-0.5">Buy</div>
        <div className={`font-mono text-sm ${getSlippageColor(bidSlippage)}`}>
          {bidSlippage > 0 ? '+' : ''}{bidSlippage.toFixed(2)}%
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-0.5">Sell</div>
        <div className={`font-mono text-sm ${getSlippageColor(askSlippage)}`}>
          {askSlippage > 0 ? '+' : ''}{askSlippage.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}
