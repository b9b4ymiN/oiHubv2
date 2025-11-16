'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OHLCV } from '@/types/market'
import { calculateVolumeProfile, findTradingOpportunities, getPriceZone } from '@/lib/features/volume-profile'
import { formatPrice } from '@/lib/utils/data'
import { TrendingUp, TrendingDown, Target, Shield, Award } from 'lucide-react'

interface OpportunityFinderCardProps {
  klines: OHLCV[]
  currentPrice?: number
}

export function OpportunityFinderCard({ klines, currentPrice }: OpportunityFinderCardProps) {
  const { profile, opportunities, zone } = useMemo(() => {
    const profile = calculateVolumeProfile(klines, 10)
    const current = currentPrice || klines[klines.length - 1]?.close || 0
    const opportunities = findTradingOpportunities(current, profile, klines)
    const zone = getPriceZone(current, profile)

    return { profile, opportunities, zone }
  }, [klines, currentPrice])

  const current = currentPrice || klines[klines.length - 1]?.close || 0

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading Opportunities</CardTitle>
          <CardDescription>
            AI-powered entry/target suggestions based on Volume Profile + Bell Curve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No high-probability setups detected at current price
          </div>
        </CardContent>
      </Card>
    )
  }

  const topOpportunity = opportunities[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trading Opportunities</span>
          <Badge variant={zone.color === 'red' ? 'danger' : zone.color === 'orange' ? 'warning' : zone.color === 'green' ? 'success' : 'outline'}>
            {zone.zone}
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered entry/target suggestions based on Volume Profile + Bell Curve
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Zone Analysis */}
          <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📊</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Current Price Zone</h3>
                <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Current:</span>
                    <span className="ml-2 font-mono font-semibold">${formatPrice(current, 2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">POC:</span>
                    <span className="ml-2 font-mono">${formatPrice(profile.poc, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Opportunity */}
          <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-3 mb-4">
              {topOpportunity.type === 'LONG' ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{topOpportunity.type} Setup</h3>
                  <Badge variant="success">
                    <Award className="h-3 w-3 mr-1" />
                    {topOpportunity.confidence}% Confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{topOpportunity.reason}</p>
              </div>
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Entry Price</span>
                </div>
                <div className="text-xl font-mono font-bold">
                  ${formatPrice(topOpportunity.entryPrice, 2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Current level
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>Target</span>
                </div>
                <div className="text-xl font-mono font-bold text-green-500">
                  ${formatPrice(topOpportunity.targetPrice, 2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  +{((topOpportunity.targetPrice - topOpportunity.entryPrice) / topOpportunity.entryPrice * 100).toFixed(2)}% gain
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <Shield className="h-4 w-4" />
                  <span>Stop Loss</span>
                </div>
                <div className="text-xl font-mono font-bold text-red-500">
                  ${formatPrice(topOpportunity.stopLoss, 2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((topOpportunity.stopLoss - topOpportunity.entryPrice) / topOpportunity.entryPrice * 100).toFixed(2)}% risk
                </div>
              </div>
            </div>

            {/* Risk/Reward */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk/Reward Ratio</span>
                <Badge variant={topOpportunity.riskReward >= 2 ? 'success' : topOpportunity.riskReward >= 1.5 ? 'warning' : 'outline'}>
                  1 : {topOpportunity.riskReward.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Alternative Opportunities */}
          {opportunities.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Alternative Setups</h4>
              {opportunities.slice(1, 4).map((opp, idx) => (
                <div key={idx} className="p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={opp.type === 'LONG' ? 'success' : 'danger'}>
                        {opp.type}
                      </Badge>
                      <span className="text-sm font-medium">{opp.confidence}% confidence</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      R:R 1:{opp.riskReward.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.reason}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Entry: </span>
                      <span className="font-mono">${formatPrice(opp.entryPrice, 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-mono text-green-500">${formatPrice(opp.targetPrice, 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stop: </span>
                      <span className="font-mono text-red-500">${formatPrice(opp.stopLoss, 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Statistical Info */}
          <div className="p-3 rounded bg-muted/50 text-xs space-y-1">
            <div className="font-semibold mb-2">📈 Statistical Context</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Mean (μ): ${formatPrice(profile.mean, 2)}</div>
              <div>Std Dev (σ): ${formatPrice(profile.stdDev, 2)}</div>
              <div>68% range: ±1σ</div>
              <div>95% range: ±2σ</div>
              <div>99.7% range: ±3σ</div>
              <div className="col-span-2 text-muted-foreground italic">
                Price statistically tends to revert to mean (POC)
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
