'use client'

import { useMemo } from 'react'
import { TakerBuySellVolume } from '@/types/market'
import {
  analyzeTakerFlow,
  getTakerFlowSignal,
  combineTakerFlowWithVolumeProfile,
  calculateCumulativeTakerFlow,
} from '@/lib/features/taker-flow-analysis'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/utils/data'
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

interface TakerFlowOverlayProps {
  takerData: TakerBuySellVolume[]
  isLVN?: boolean
  isHVN?: boolean
  priceZone?: 'ABOVE_POC' | 'AT_POC' | 'BELOW_POC'
}

export function TakerFlowOverlay({
  takerData,
  isLVN = false,
  isHVN = false,
  priceZone = 'AT_POC',
}: TakerFlowOverlayProps) {
  const { analysis, combinedSignal, currentSignal, cumulativeFlow } = useMemo(() => {
    const analysis = analyzeTakerFlow(takerData)
    const combinedSignal = combineTakerFlowWithVolumeProfile(
      analysis,
      isLVN,
      isHVN,
      priceZone
    )

    const currentSignal = analysis.flows.length > 0
      ? getTakerFlowSignal(analysis.flows[analysis.flows.length - 1])
      : null

    const cumulativeFlow = calculateCumulativeTakerFlow(analysis.flows)

    return { analysis, combinedSignal, currentSignal, cumulativeFlow }
  }, [takerData, isLVN, isHVN, priceZone])

  if (analysis.flows.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-muted/30 text-center text-sm text-muted-foreground">
        No taker flow data available
      </div>
    )
  }

  // Prepare chart data (last 20 periods)
  const chartData = analysis.flows.slice(-20).map((flow, i) => ({
    index: i,
    netFlow: flow.netFlow,
    buyVolume: flow.buyVolume,
    sellVolume: flow.sellVolume,
    color: flow.netFlow > 0 ? '#10B981' : '#EF4444',
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-blue-500">💹 Taker Flow (Aggressive Orders)</div>
        <Badge variant="outline" className="text-xs">
          {analysis.flowStrength} {analysis.dominantFlow.replace('_', ' ')}
        </Badge>
      </div>

      {/* Current Signal with Volume Profile */}
      <div className={`p-3 rounded-lg border ${
        combinedSignal.signal === 'STRONG_LONG' || combinedSignal.signal === 'BREAKOUT'
          ? 'bg-green-500/10 border-green-500/30'
        : combinedSignal.signal === 'STRONG_SHORT' || combinedSignal.signal === 'FAKEOUT'
          ? 'bg-red-500/10 border-red-500/30'
        : 'bg-blue-500/10 border-blue-500/30'
      }`}>
        <div className="flex items-start gap-2">
          {combinedSignal.signal === 'STRONG_LONG' || combinedSignal.signal === 'BREAKOUT' ? (
            <TrendingUp className="h-4 w-4 mt-0.5 text-green-400" />
          ) : combinedSignal.signal === 'STRONG_SHORT' || combinedSignal.signal === 'FAKEOUT' ? (
            <TrendingDown className="h-4 w-4 mt-0.5 text-red-400" />
          ) : (
            <ArrowRightLeft className="h-4 w-4 mt-0.5 text-blue-400" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs font-semibold">
                {combinedSignal.signal === 'STRONG_LONG' ? '🟢 STRONG LONG' :
                 combinedSignal.signal === 'STRONG_SHORT' ? '🔴 STRONG SHORT' :
                 combinedSignal.signal === 'BREAKOUT' ? '🚀 BREAKOUT' :
                 combinedSignal.signal === 'FAKEOUT' ? '⚠️ FAKEOUT' :
                 '⏸️ WAIT'}
              </div>
              <Badge variant="outline" className="text-xs">
                {combinedSignal.confidence}% confidence
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {combinedSignal.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-muted-foreground mb-1">Buy Flow</div>
          <div className="font-mono font-semibold text-green-400">
            {formatNumber(analysis.totalBuyVolume)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="text-muted-foreground mb-1">Sell Flow</div>
          <div className="font-mono font-semibold text-red-400">
            {formatNumber(analysis.totalSellVolume)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-muted-foreground mb-1">Net Flow</div>
          <div className={`font-mono font-semibold ${
            analysis.avgNetFlow > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {analysis.avgNetFlow > 0 ? '+' : ''}{formatNumber(analysis.avgNetFlow)}
          </div>
        </div>
      </div>

      {/* Current Flow Pressure */}
      {currentSignal && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold">Current Pressure:</div>
            <Badge
              variant={currentSignal.strength === 'STRONG' ? 'default' : 'outline'}
              className="text-xs"
            >
              {currentSignal.strength}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentSignal.description}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {currentSignal.signal === 'BUY_PRESSURE' ? (
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-semibold">Buyers Aggressive</span>
              </div>
            ) : currentSignal.signal === 'SELL_PRESSURE' ? (
              <div className="flex items-center gap-1 text-red-400">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-semibold">Sellers Aggressive</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <ArrowRightLeft className="h-3 w-3" />
                <span className="text-xs font-semibold">Balanced</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Net Flow Chart */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          Net Taker Flow (Last 20 periods):
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="index" stroke="#9CA3AF" fontSize={10} />
            <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={formatNumber} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatNumber(value), 'Net Flow']}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Bar dataKey="netFlow" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bias Indicator */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Overall Bias:</div>
          <Badge
            variant={analysis.currentBias === 'BULLISH' ? 'default' : 'outline'}
            className={`text-xs ${
              analysis.currentBias === 'BULLISH' ? 'bg-green-500' :
              analysis.currentBias === 'BEARISH' ? 'bg-red-500' :
              ''
            }`}
          >
            {analysis.currentBias}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {analysis.currentBias === 'BULLISH'
            ? '🟢 Sustained aggressive buying - Bullish momentum'
          : analysis.currentBias === 'BEARISH'
            ? '🔴 Sustained aggressive selling - Bearish momentum'
            : '⚪ No clear directional bias'}
        </div>
      </div>

      {/* Interpretation */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
        <div className="font-semibold text-blue-400 mb-1">💡 How to Read with Volume Profile:</div>
        <div className="text-muted-foreground">
          • <span className="text-green-400">LVN + Taker Buy</span> = Real breakout (follow)
        </div>
        <div className="text-muted-foreground">
          • <span className="text-red-400">LVN + Taker Sell</span> = Fakeout/Trap (fade)
        </div>
        <div className="text-muted-foreground">
          • <span className="text-blue-400">HVN + Sideways Flow</span> = Accumulation (wait)
        </div>
        <div className="text-muted-foreground">
          • <span className="text-purple-400">Strong flow at POC</span> = Directional move coming
        </div>
      </div>
    </div>
  )
}
