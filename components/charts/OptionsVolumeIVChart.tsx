'use client'

import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { OptionsChain, VolatilitySmile, OptionsVolumeByStrike } from '@/types/market'
import { formatPrice, formatNumber } from '@/lib/utils/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, PlayCircle, RotateCcw } from 'lucide-react'

interface OptionsVolumeIVChartProps {
  chain: OptionsChain
  smile: VolatilitySmile
  volumeByStrike: OptionsVolumeByStrike[]
  height?: number
}

// Step-by-step tutorial steps
const TUTORIAL_STEPS = [
  {
    id: 0,
    title: '👋 Welcome to Professional Options Analysis',
    description: 'Learn how professional traders use options data to find support, resistance, and expected price moves.',
    highlight: 'none' as const,
    instruction: 'This interactive guide will teach you step-by-step how to read options flow like a pro. Click "Next" to begin.',
  },
  {
    id: 1,
    title: '📊 Step 1: Understanding the Chart',
    description: 'This chart shows options volume and implied volatility (IV) across different strike prices.',
    highlight: 'chart' as const,
    instruction: 'The X-axis shows strike prices. The left Y-axis shows volume. The right Y-axis shows volatility percentage.',
  },
  {
    id: 2,
    title: '🟠 Step 2: Put Volume (Orange Bars)',
    description: 'Orange bars show PUT option volume - bets that price will go DOWN or protection against downside.',
    highlight: 'puts' as const,
    instruction: 'Large orange bars = Heavy put buying = Traders expect support at these levels OR hedging downside risk.',
  },
  {
    id: 3,
    title: '🔵 Step 3: Call Volume (Blue Bars)',
    description: 'Blue bars show CALL option volume - bets that price will go UP or hedging short positions.',
    highlight: 'calls' as const,
    instruction: 'Large blue bars = Heavy call buying = Bullish speculation OR large call writing (resistance zones).',
  },
  {
    id: 4,
    title: '📈 Step 4: Volatility Smile (Orange Curve)',
    description: 'The orange curve shows IMPLIED VOLATILITY (IV) - how much the market expects price to move.',
    highlight: 'smile' as const,
    instruction: 'Higher IV = Market expects bigger moves near that strike. IV spikes often predict where price will test.',
  },
  {
    id: 5,
    title: '🎯 Step 5: Spot Price (Gray Dotted Line)',
    description: 'The gray dotted line shows the CURRENT PRICE of the underlying asset (BTC, ETH, etc.).',
    highlight: 'spot' as const,
    instruction: 'Strikes BELOW spot are "in the money" for puts. Strikes ABOVE spot are "in the money" for calls.',
  },
  {
    id: 6,
    title: '🟢 Step 6: Expected Range (Green/Red Lines)',
    description: 'Green (+1σ) and Red (-1σ) lines show where price is expected to stay 68% of the time.',
    highlight: 'range' as const,
    instruction: 'The ±1σ range gives you the EXPECTED MOVE by expiration. Use this for position sizing and risk management.',
  },
  {
    id: 7,
    title: '🛡️ Step 7: Support Zones (Dark Orange Bars)',
    description: 'Dark orange/red bars show SUPPORT LEVELS - where heavy put buying creates price floors.',
    highlight: 'support' as const,
    instruction: 'Professional traders defend these levels. If price breaks support, stop losses trigger and price accelerates down.',
  },
  {
    id: 8,
    title: '⚔️ Step 8: Resistance Zones (Dark Blue Bars)',
    description: 'Dark blue bars show RESISTANCE LEVELS - where heavy call writing caps upside.',
    highlight: 'resistance' as const,
    instruction: 'Call sellers (market makers) defend these strikes. Breaking resistance often triggers short squeezes.',
  },
  {
    id: 9,
    title: '🎓 Step 9: Putting It All Together',
    description: 'Now you can read options flow like a professional trader!',
    highlight: 'all' as const,
    instruction: 'Look for: 1) Heavy put OI below spot (support), 2) Heavy call OI above spot (resistance), 3) IV spikes (expected volatility), 4) Expected range for risk management.',
  },
]

/**
 * OPTIONS VOLUME + IMPLIED VOLATILITY CHART
 * 
 * Interactive step-by-step tutorial mode for educational landing page
 */
export function OptionsVolumeIVChart({
  chain,
  smile,
  volumeByStrike,
  height = 500,
}: OptionsVolumeIVChartProps) {
  // Tutorial state
  const [tutorialMode, setTutorialMode] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setTutorialMode(false) // Exit tutorial on last step
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetTutorial = () => {
    setCurrentStep(0)
    setTutorialMode(true)
  }

  const step = TUTORIAL_STEPS[currentStep]
  const chartData = useMemo(() => {
    const data = volumeByStrike.map((vol) => {
      const strike = vol.strike
      const strikeIndex = smile.strikes.indexOf(strike)

      // Get IV for this strike - with fallback to ATM IV if data missing
      let callIV = strikeIndex >= 0 ? smile.callIVs[strikeIndex] : smile.atmIV
      let putIV = strikeIndex >= 0 ? smile.putIVs[strikeIndex] : smile.atmIV

      // Fallback: If IV is 0 or invalid, use ATM IV
      if (!callIV || callIV === 0) callIV = smile.atmIV
      if (!putIV || putIV === 0) putIV = smile.atmIV

      const avgIV = (callIV + putIV) / 2

      return {
        strike,
        putVolume: vol.putVolume,
        callVolume: vol.callVolume,
        putOI: vol.putOI,
        callOI: vol.callOI,
        volatility: avgIV * 100, // Convert to percentage
        callIV: callIV * 100,
        putIV: putIV * 100,
        isSupport: vol.isSupport,
        isResistance: vol.isResistance,
      }
    })

    // Debug: Log IV data
    console.log('📊 Options Chart Data:', {
      atmIV: (smile.atmIV * 100).toFixed(2) + '%',
      dataPoints: data.length,
      sampleIV: data[0]?.volatility.toFixed(2) + '%',
      avgVolatility: (data.reduce((sum, d) => sum + d.volatility, 0) / data.length).toFixed(2) + '%',
    })

    return data
  }, [volumeByStrike, smile])

  // Calculate totals for legend
  const totalPutVolume = volumeByStrike.reduce((sum, v) => sum + v.putVolume, 0)
  const totalCallVolume = volumeByStrike.reduce((sum, v) => sum + v.callVolume, 0)

  // Calculate expected ranges (±1σ and ±2σ)
  const spotPrice = chain.spotPrice
  const expectedMove1Sigma = spotPrice * smile.atmIV // ±1 standard deviation (~68% probability)
  const expectedMove2Sigma = spotPrice * smile.atmIV * 2 // ±2 standard deviations (~95% probability)

  const upperRange1Sigma = spotPrice + expectedMove1Sigma
  const lowerRange1Sigma = spotPrice - expectedMove1Sigma
  const upperRange2Sigma = spotPrice + expectedMove2Sigma
  const lowerRange2Sigma = spotPrice - expectedMove2Sigma

  // Max volume for scaling
  const maxVolume = Math.max(
    ...chartData.map((d) => Math.max(d.putVolume, d.callVolume))
  )

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No options data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      

      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {chain.underlying} VOL2VOL™ EXPECTED RANGE INTRADAY VOLUME
        </h3>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>
            Calls ({formatNumber(totalCallVolume)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded" />
          <span>
            Puts ({formatNumber(totalPutVolume)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-yellow-400" />
          <span>Call IV ({(smile.atmIV * 100).toFixed(2)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span>Put IV</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-400 border-dashed border-t-2" />
          <span>Spot ({formatPrice(spotPrice, 1)})</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 40, right: 60, left: 20, bottom: 60 }}
        >
          <defs>
            {/* Gradient for ±1σ range (68% probability) */}
            <linearGradient id="range1SigmaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="50%" stopColor="#2563EB" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
            </linearGradient>

            {/* Gradient for ±2σ range (95% probability) */}
            <linearGradient id="range2SigmaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.15} />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.15} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          {/* X-Axis: Strike */}
          <XAxis
            dataKey="strike"
            tickFormatter={(value) => `${formatPrice(value, 0)}`}
            stroke="#9CA3AF"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
            label={{
              value: 'Strike',
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#9CA3AF', fontSize: 12 },
            }}
          />

          {/* Left Y-Axis: Volume */}
          <YAxis
            yAxisId="volume"
            orientation="left"
            tickFormatter={(value) => formatNumber(value)}
            stroke="#3B82F6"
            fontSize={11}
            label={{
              value: 'Intraday Volume',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#3B82F6', fontSize: 12 },
            }}
            domain={[0, maxVolume * 1.2]}
          />

          {/* Right Y-Axis: Volatility % */}
          <YAxis
            yAxisId="volatility"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(2)}`}
            stroke="#F59E0B"
            fontSize={11}
            label={{
              value: 'Volatility',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#F59E0B', fontSize: 12 },
            }}
            domain={[
              Math.min(...chartData.map((d) => d.volatility)) * 0.9,
              Math.max(...chartData.map((d) => d.volatility)) * 1.1,
            ]}
          />

          <Tooltip content={<CustomTooltip spotPrice={spotPrice} />} />

          {/* Shaded probability zone (±1σ background) */}
          <Area
            yAxisId="volatility"
            type="monotone"
            dataKey="volatility"
            stroke="none"
            fill="url(#range1SigmaGradient)"
            fillOpacity={0.4}
          />

          {/* Call Volume Bars (Blue/Cyan - matching example.jpg) */}
          <Bar yAxisId="volume" dataKey="callVolume" radius={[4, 4, 0, 0]} stackId="volume">
            {chartData.map((entry, index) => {
              // Blue/Cyan color scheme for calls (matching example.jpg)
              let fill = entry.strike < spotPrice ? '#60A5FA' : '#3B82F6'
              let opacity = 0.8

              // Tutorial mode highlighting
              if (tutorialMode) {
                if (step.highlight === 'calls') {
                  opacity = 1 // Full opacity for calls
                } else if (step.highlight === 'puts' || step.highlight === 'smile' || step.highlight === 'spot' || step.highlight === 'range') {
                  opacity = 0.2 // Dim calls when highlighting other elements
                } else if (step.highlight === 'resistance' && !entry.isResistance) {
                  opacity = 0.3 // Dim non-resistance calls
                } else if (step.highlight === 'support') {
                  opacity = 0.2 // Dim calls when showing support
                }
              }

              // Highlight resistance levels (heavy call writing)
              if (entry.isResistance) {
                fill = '#1D4ED8' // Darker blue for resistance
              }

              return <Cell key={`call-${index}`} fill={fill} fillOpacity={opacity} />
            })}
          </Bar>

          {/* Put Volume Bars (Orange/Amber - matching example.jpg) */}
          <Bar yAxisId="volume" dataKey="putVolume" radius={[4, 4, 0, 0]} stackId="volume">
            {chartData.map((entry, index) => {
              // Orange/Amber color scheme for puts (matching example.jpg)
              let fill = entry.strike > spotPrice ? '#F59E0B' : '#FBBF24'
              let opacity = 0.8

              // Tutorial mode highlighting
              if (tutorialMode) {
                if (step.highlight === 'puts') {
                  opacity = 1 // Full opacity for puts
                } else if (step.highlight === 'calls' || step.highlight === 'smile' || step.highlight === 'spot' || step.highlight === 'range') {
                  opacity = 0.2 // Dim puts when highlighting other elements
                } else if (step.highlight === 'support' && !entry.isSupport) {
                  opacity = 0.3 // Dim non-support puts
                } else if (step.highlight === 'resistance') {
                  opacity = 0.2 // Dim puts when showing resistance
                }
              }

              // Highlight support levels (heavy put buying)
              if (entry.isSupport) {
                fill = '#DC2626' // Darker red for support
              }

              return <Cell key={`put-${index}`} fill={fill} fillOpacity={opacity} />
            })}
          </Bar>

          {/* Volatility Smile Curve (Yellow/Green - matching example.jpg) */}
          <Line
            yAxisId="volatility"
            type="monotone"
            dataKey="callIV"
            stroke="#FBBF24"
            strokeWidth={tutorialMode && step.highlight === 'smile' ? 5 : 2.5}
            dot={{ fill: '#FBBF24', r: tutorialMode && step.highlight === 'smile' ? 5 : 3 }}
            activeDot={{ r: 5 }}
            name="Call IV"
            connectNulls
            opacity={
              tutorialMode && (step.highlight === 'puts' || step.highlight === 'calls' || step.highlight === 'spot' || step.highlight === 'range' || step.highlight === 'support' || step.highlight === 'resistance')
                ? 0.3
                : 1
            }
          />
          <Line
            yAxisId="volatility"
            type="monotone"
            dataKey="putIV"
            stroke="#10B981"
            strokeWidth={tutorialMode && step.highlight === 'smile' ? 5 : 2.5}
            dot={{ fill: '#10B981', r: tutorialMode && step.highlight === 'smile' ? 5 : 3 }}
            activeDot={{ r: 5 }}
            name="Put IV"
            connectNulls
            opacity={
              tutorialMode && (step.highlight === 'puts' || step.highlight === 'calls' || step.highlight === 'spot' || step.highlight === 'range' || step.highlight === 'support' || step.highlight === 'resistance')
                ? 0.3
                : 1
            }
          />

          {/* Spot Price Reference Line (Gray dotted) */}
          <ReferenceLine
            x={spotPrice}
            stroke="#9CA3AF"
            strokeWidth={tutorialMode && step.highlight === 'spot' ? 4 : 2}
            strokeDasharray="8 4"
            yAxisId="volume"
            label={{
              value: `Spot: $${formatPrice(spotPrice, 1)}`,
              position: 'top',
              fill: '#9CA3AF',
              fontSize: tutorialMode && step.highlight === 'spot' ? 13 : 11,
              fontWeight: tutorialMode && step.highlight === 'spot' ? 'bold' : 'normal',
            }}
            opacity={
              tutorialMode && (step.highlight === 'puts' || step.highlight === 'calls' || step.highlight === 'smile' || step.highlight === 'support' || step.highlight === 'resistance')
                ? 0.3
                : 1
            }
          />

          {/* ATM Strike Line (Purple) */}
          <ReferenceLine
            x={smile.atmStrike}
            stroke="#A855F7"
            strokeWidth={1}
            strokeDasharray="3 3"
            yAxisId="volume"
            label={{
              value: 'ATM',
              position: 'center',
              fill: '#A855F7',
              fontSize: 12,
            }}
          />

          {/* Expected Range Boundaries - ±1σ (68% probability) */}
          <ReferenceLine
            x={upperRange1Sigma}
            stroke="#10B981"
            strokeWidth={tutorialMode && step.highlight === 'range' ? 4 : 2}
            strokeDasharray="5 5"
            yAxisId="volume"
            label={{
              value: '+1σ (68%)',
              position: 'top',
              fill: '#10B981',
              fontSize: tutorialMode && step.highlight === 'range' ? 12 : 10,
              fontWeight: 'bold',
            }}
            opacity={
              tutorialMode && (step.highlight === 'puts' || step.highlight === 'calls' || step.highlight === 'smile' || step.highlight === 'spot' || step.highlight === 'support' || step.highlight === 'resistance')
                ? 0.3
                : 1
            }
          />
          <ReferenceLine
            x={lowerRange1Sigma}
            stroke="#EF4444"
            strokeWidth={tutorialMode && step.highlight === 'range' ? 4 : 2}
            strokeDasharray="5 5"
            yAxisId="volume"
            label={{
              value: '-1σ (68%)',
              position: 'top',
              fill: '#EF4444',
              fontSize: tutorialMode && step.highlight === 'range' ? 12 : 10,
              fontWeight: 'bold',
            }}
            opacity={
              tutorialMode && (step.highlight === 'puts' || step.highlight === 'calls' || step.highlight === 'smile' || step.highlight === 'spot' || step.highlight === 'support' || step.highlight === 'resistance')
                ? 0.3
                : 1
            }
          />

          {/* Expected Range Boundaries - ±2σ (95% probability) */}
          <ReferenceLine
            x={upperRange2Sigma}
            stroke="#10B981"
            strokeWidth={1}
            strokeDasharray="2 2"
            yAxisId="volume"
            opacity={0.5}
            label={{
              value: '+2σ (95%)',
              position: 'top',
              fill: '#10B981',
              fontSize: 9,
            }}
          />
          <ReferenceLine
            x={lowerRange2Sigma}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="2 2"
            yAxisId="volume"
            opacity={0.5}
            label={{
              value: '-2σ (95%)',
              position: 'top',
              fill: '#EF4444',
              fontSize: 9,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm p-4 rounded-lg border bg-muted/30">
        <div>
          <div className="text-xs text-muted-foreground">ATM IV</div>
          <div className="font-mono font-semibold text-orange-500">
            {(smile.atmIV * 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Skew</div>
          <div
            className={`font-mono font-semibold ${
              smile.skew > 0 ? 'text-red-500' : smile.skew < 0 ? 'text-green-500' : 'text-gray-500'
            }`}
          >
            {(smile.skew * 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">±1σ Move (68%)</div>
          <div className="font-mono font-semibold text-blue-500">
            ±${formatPrice(expectedMove1Sigma, 0)}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {formatPrice(lowerRange1Sigma, 0)} - {formatPrice(upperRange1Sigma, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">±2σ Move (95%)</div>
          <div className="font-mono font-semibold text-purple-500">
            ±${formatPrice(expectedMove2Sigma, 0)}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {formatPrice(lowerRange2Sigma, 0)} - {formatPrice(upperRange2Sigma, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current Spot</div>
          <div className="font-mono font-semibold text-gray-500">
            ${formatPrice(spotPrice, 1)}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="text-xs text-muted-foreground space-y-1 p-4 rounded-lg border bg-muted/20">
        <div className="font-semibold text-foreground mb-2">📊 Chart Interpretation:</div>
        <div>
          • <span className="text-orange-500">Orange bars</span>: Put volume (bearish protection or
          speculation)
        </div>
        <div>
          • <span className="text-blue-500">Blue bars</span>: Call volume (bullish speculation or
          hedging)
        </div>
        <div>
          • <span className="text-orange-600">Volatility curve</span>: Shows where market expects
          biggest moves
        </div>
        <div>
          • Heavy put OI below spot = <span className="text-green-500">Support zone</span> (buyers
          defending downside)
        </div>
        <div>
          • Heavy call OI above spot = <span className="text-red-500">Resistance zone</span>{' '}
          (sellers capping upside)
        </div>
        <div>
          • IV spike at strike = Market expects price action near that level
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, spotPrice }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-background border-2 border-primary/50 rounded-lg shadow-xl p-4 space-y-2">
      <div className="font-semibold text-lg border-b pb-2">
        Strike: ${formatPrice(data.strike, 0)}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-orange-500">Put Volume:</span>
          <span className="font-mono font-semibold">{formatNumber(data.putVolume)}</span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-blue-500">Call Volume:</span>
          <span className="font-mono font-semibold">{formatNumber(data.callVolume)}</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Put OI:</span>
            <span className="font-mono">{formatNumber(data.putOI)}</span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Call OI:</span>
            <span className="font-mono">{formatNumber(data.callOI)}</span>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">IV (Avg):</span>
            <span className="font-mono text-orange-500">{data.volatility.toFixed(2)}%</span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Distance from Spot:</span>
            <span
              className={`font-mono ${
                data.strike > spotPrice ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {((data.strike - spotPrice) / spotPrice * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {data.isSupport && (
          <div className="bg-green-500/20 px-2 py-1 rounded text-green-400 font-semibold text-xs mt-2">
            🛡️ SUPPORT LEVEL - Heavy Put Buying
          </div>
        )}

        {data.isResistance && (
          <div className="bg-red-500/20 px-2 py-1 rounded text-red-400 font-semibold text-xs mt-2">
            ⚔️ RESISTANCE LEVEL - Heavy Call Writing
          </div>
        )}
      </div>
    </div>
  )
}
