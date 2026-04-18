'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import Link from 'next/link'

interface StrategyParam {
  type: 'number' | 'string' | 'boolean' | 'select'
  default: unknown
  description: string
  min?: number
  max?: number
  options?: string[]
}

interface Strategy {
  id: string
  version: string
  name: string
  description: string
  paramSchema: Record<string, StrategyParam>
}

const STRATEGIES: Strategy[] = [
  {
    id: 'statistical-mean-reversion',
    version: '1.0.0',
    name: 'Statistical Mean Reversion',
    description: 'Enters when price deviates significantly from mean, exits on reversion',
    paramSchema: {
      lookback: { type: 'number', default: 20, description: 'Lookback period for z-score calculation', min: 5, max: 100 },
      entryThreshold: { type: 'number', default: 2.0, description: 'Z-score threshold for entry', min: 1.0, max: 4.0 },
      riskPerTrade: { type: 'number', default: 0.02, description: 'Risk per trade as fraction of equity', min: 0.001, max: 0.1 },
    },
  },
  {
    id: 'oi-volume-double-confirmation',
    version: '1.0.0',
    name: 'OI + Volume Double Confirmation',
    description: 'Requires both OI momentum signal and volume spike for entry',
    paramSchema: {
      volumeLookback: { type: 'number', default: 20, description: 'Lookback for average volume', min: 5, max: 50 },
      volumeThreshold: { type: 'number', default: 1.5, description: 'Volume multiplier for spike detection', min: 1.0, max: 5.0 },
      useTrailingStop: { type: 'boolean', default: true, description: 'Use trailing stop based on OI decline' },
    },
  },
  {
    id: 'regime-based-momentum',
    version: '1.0.0',
    name: 'Regime-Based Momentum',
    description: 'Adapts strategy based on market regime classification',
    paramSchema: {
      traverseHighVol: { type: 'boolean', default: false, description: 'Allow trading in high volatility regime' },
      baseRiskPerTrade: { type: 'number', default: 0.02, description: 'Base risk per trade as fraction', min: 0.001, max: 0.1 },
    },
  },
]

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d']

interface FormErrors {
  symbol?: string
  interval?: string
  startDate?: string
  endDate?: string
  strategy?: string
  initialCapital?: string
  general?: string
}

interface FormData {
  symbol: string
  interval: string
  startDate: string
  endDate: string
  strategyId: string
  strategyParams: Record<string, unknown>
  initialCapital: string
  slippageModel: string
  slippageValue: string
  makerFee: string
  takerFee: string
  enableFunding: boolean
}

export default function ConfigForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    symbol: 'BTCUSDT',
    interval: '5m',
    startDate: '',
    endDate: '',
    strategyId: 'statistical-mean-reversion',
    strategyParams: {},
    initialCapital: '10000',
    slippageModel: 'percentage',
    slippageValue: '0.01',
    makerFee: '0.0002',
    takerFee: '0.0005',
    enableFunding: true,
  })

  // Initialize strategy params with defaults
  useState(() => {
    const selectedStrategy = STRATEGIES.find(s => s.id === formData.strategyId)
    if (selectedStrategy) {
      const params: Record<string, unknown> = {}
      Object.entries(selectedStrategy.paramSchema).forEach(([key, def]) => {
        params[key] = def.default
      })
      setFormData(prev => ({ ...prev, strategyParams: params }))
    }
  })

  const selectedStrategy = STRATEGIES.find(s => s.id === formData.strategyId)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.symbol) {
      newErrors.symbol = 'Symbol is required'
    }

    if (!formData.interval) {
      newErrors.interval = 'Interval is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      const start = new Date(formData.startDate)
      if (isNaN(start.getTime())) {
        newErrors.startDate = 'Invalid start date'
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else {
      const end = new Date(formData.endDate)
      if (isNaN(end.getTime())) {
        newErrors.endDate = 'Invalid end date'
      }
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (start >= end) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    if (!formData.strategyId) {
      newErrors.strategy = 'Strategy is required'
    }

    const capital = parseFloat(formData.initialCapital)
    if (isNaN(capital) || capital <= 0) {
      newErrors.initialCapital = 'Initial capital must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          interval: formData.interval,
          startTime: new Date(formData.startDate).getTime(),
          endTime: new Date(formData.endDate).getTime(),
          strategyId: formData.strategyId,
          strategyParams: formData.strategyParams,
          initialCapital: parseFloat(formData.initialCapital),
          seed: Date.now(),
          fillModel: {
            slippageModel: formData.slippageModel as 'none' | 'fixed' | 'percentage' | 'adaptive',
            slippageValue: parseFloat(formData.slippageValue),
            feeModel: 'binance-futures',
            makerFee: parseFloat(formData.makerFee),
            takerFee: parseFloat(formData.takerFee),
            enableFunding: formData.enableFunding,
            enableLiquidationCascade: true,
            enableDowntimeGaps: true,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start backtest')
      }

      const data = await response.json()
      const backtestId = data.id

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/backtest/${backtestId}/status`)
          if (!statusResponse.ok) {
            clearInterval(pollInterval)
            throw new Error('Failed to check status')
          }

          const statusData = await statusResponse.json()

          if (statusData.status === 'completed') {
            clearInterval(pollInterval)
            router.push(`/backtest/${backtestId}`)
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setErrors({ general: statusData.error || 'Backtest failed' })
            setIsSubmitting(false)
          }
        } catch (error) {
          clearInterval(pollInterval)
          setErrors({ general: error instanceof Error ? error.message : 'Failed to check status' })
          setIsSubmitting(false)
        }
      }, 2000)

    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to start backtest' })
      setIsSubmitting(false)
    }
  }

  const setQuickDateRange = (range: string) => {
    const end = new Date()
    const start = new Date()

    switch (range) {
      case '1M':
        start.setMonth(start.getMonth() - 1)
        break
      case '3M':
        start.setMonth(start.getMonth() - 3)
        break
      case '6M':
        start.setMonth(start.getMonth() - 6)
        break
      case '1Y':
        start.setFullYear(start.getFullYear() - 1)
        break
      case '2Y':
        start.setFullYear(start.getFullYear() - 2)
        break
      case 'All':
        start.setFullYear(2020, 0, 1)
        break
    }

    setFormData(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }))
  }

  const updateStrategyParam = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      strategyParams: {
        ...prev.strategyParams,
        [key]: value,
      },
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Configuration</CardTitle>
          <CardDescription>Configure the symbol, timeframe, and date range for your backtest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Symbol */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SYMBOLS.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            {errors.symbol && <p className="text-red-500 text-sm">{errors.symbol}</p>}
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Interval</label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData(prev => ({ ...prev, interval: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {INTERVALS.map(interval => (
                <option key={interval} value={interval}>{interval.toUpperCase()}</option>
              ))}
            </select>
            {errors.interval && <p className="text-red-500 text-sm">{errors.interval}</p>}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['1M', '3M', '6M', '1Y', '2Y', 'All'].map(range => (
                <Button
                  key={range}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(range)}
                  className="text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Initial Capital */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Capital (USDT)</label>
            <input
              type="number"
              value={formData.initialCapital}
              onChange={(e) => setFormData(prev => ({ ...prev, initialCapital: e.target.value }))}
              min="0"
              step="100"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.initialCapital && <p className="text-red-500 text-sm">{errors.initialCapital}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Strategy Configuration</CardTitle>
          <CardDescription>Select a strategy and configure its parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy</label>
            <select
              value={formData.strategyId}
              onChange={(e) => {
                const newStrategyId = e.target.value
                const newStrategy = STRATEGIES.find(s => s.id === newStrategyId)
                const newParams: Record<string, unknown> = {}

                if (newStrategy) {
                  Object.entries(newStrategy.paramSchema).forEach(([key, def]) => {
                    newParams[key] = def.default
                  })
                }

                setFormData(prev => ({
                  ...prev,
                  strategyId: newStrategyId,
                  strategyParams: newParams,
                }))
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STRATEGIES.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} - {strategy.description}
                </option>
              ))}
            </select>
            {errors.strategy && <p className="text-red-500 text-sm">{errors.strategy}</p>}
          </div>

          {/* Strategy Parameters */}
          {selectedStrategy && (
            <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy Parameters</h3>
              {Object.entries(selectedStrategy.paramSchema).map(([key, paramDef]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{paramDef.description}</p>

                  {paramDef.type === 'number' && (
                    <input
                      type="number"
                      value={(formData.strategyParams[key] as number) ?? (paramDef.default as number)}
                      onChange={(e) => updateStrategyParam(key, parseFloat(e.target.value))}
                      min={paramDef.min}
                      max={paramDef.max}
                      step={(paramDef.default as number) < 1 ? 0.01 : 1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  {paramDef.type === 'boolean' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={formData.strategyParams[key] as boolean || false}
                        onChange={(e) => updateStrategyParam(key, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={key} className="text-sm text-gray-700 dark:text-gray-300">
                        {formData.strategyParams[key] ? 'Enabled' : 'Disabled'}
                      </label>
                    </div>
                  )}

                  {paramDef.type === 'select' && paramDef.options && (
                    <select
                      value={(formData.strategyParams[key] as string) ?? (paramDef.default as string)}
                      onChange={(e) => updateStrategyParam(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {paramDef.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <CardTitle className="text-lg">Advanced Configuration</CardTitle>
            </div>
            {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>Fill model, fees, and execution settings</CardDescription>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            {/* Slippage Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slippage Model</label>
              <select
                value={formData.slippageModel}
                onChange={(e) => setFormData(prev => ({ ...prev, slippageModel: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">None</option>
                <option value="fixed">Fixed (basis points)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="adaptive">Adaptive</option>
              </select>
            </div>

            {/* Slippage Value */}
            {formData.slippageModel !== 'none' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slippage Value</label>
                <input
                  type="number"
                  value={formData.slippageValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, slippageValue: e.target.value }))}
                  min="0"
                  step="0.001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.slippageModel === 'fixed' ? 'Basis points' : 'Percentage (%)'}
                </p>
              </div>
            )}

            {/* Fees */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maker Fee</label>
                <input
                  type="number"
                  value={formData.makerFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, makerFee: e.target.value }))}
                  min="0"
                  max="1"
                  step="0.0001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Default: 0.0002 (0.02%)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Taker Fee</label>
                <input
                  type="number"
                  value={formData.takerFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, takerFee: e.target.value }))}
                  min="0"
                  max="1"
                  step="0.0001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Default: 0.0005 (0.05%)</p>
              </div>
            </div>

            {/* Enable Funding */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableFunding"
                checked={formData.enableFunding}
                onChange={(e) => setFormData(prev => ({ ...prev, enableFunding: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enableFunding" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Funding Rate Payments
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex items-center gap-4">
        <Link href="/backtest">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Backtest...
            </>
          ) : (
            'Run Backtest'
          )}
        </Button>
      </div>
    </form>
  )
}
