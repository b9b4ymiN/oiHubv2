'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

interface WhaleTransactionFeedProps {
  symbol: string
}

/**
 * Whale Transaction Feed Component
 *
 * Note: Binance Futures API does not publicly provide individual large transaction data.
 * This component serves as a placeholder/template for when such data becomes available
 * through:
 * - Premium data providers (CryptoQuant, Glassnode, etc.)
 * - Custom WebSocket monitoring
 * - Third-party aggregation services
 *
 * For now, it displays a notice that this feature requires external data sources.
 */
export function WhaleTransactionFeed({ symbol }: WhaleTransactionFeedProps) {
  // In production, this would connect to a whale transaction API or WebSocket
  // const { data: whaleTransactions, isLoading } = useWhaleTransactions(symbol, 100)

  return (
    <Card className="border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors">
      <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Whale Transaction Feed
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Large orders {'>'}$1M (Requires premium data provider)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-4">
          {/* Feature Notice */}
          <div className="p-4 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Feature Status: Data Source Required
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-2">
                  <p>
                    Binance Futures public API does not provide individual large transaction data for privacy reasons.
                  </p>
                  <p>
                    To enable this feature, integrate with one of these premium data providers:
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                    <li><strong>CryptoQuant</strong> - Whale Alert & Exchange Flow data</li>
                    <li><strong>Glassnode</strong> - On-chain whale movements</li>
                    <li><strong>Whale Alert</strong> - Real-time large transaction monitoring</li>
                    <li><strong>Custom WebSocket</strong> - Aggregate trade monitoring ({'>'} threshold)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Example (for demonstration) */}
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Example View (When Data Available):
            </div>
            <ScrollArea className="h-[300px] rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-3 space-y-2">
                {/* Mock whale transactions */}
                {mockWhaleTransactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      tx.side === 'BUY'
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {tx.side === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <Badge
                          variant={tx.side === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {tx.side}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tx.type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Amount</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {tx.amount.toLocaleString()} {tx.asset}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Value</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          ${(tx.value / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Price</div>
                        <div className="font-mono text-gray-900 dark:text-gray-100">
                          ${tx.price.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Time</div>
                        <div className="text-gray-900 dark:text-gray-100">
                          {tx.time}
                        </div>
                      </div>
                    </div>

                    {tx.note && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                          💡 {tx.note}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Implementation Guide */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📚 Implementation Options:
            </div>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <span className="font-semibold">Option 1:</span>
                <span>Monitor Binance aggTrade WebSocket and flag orders {'>'} $1M threshold</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">Option 2:</span>
                <span>Integrate Whale Alert API for cross-exchange whale tracking</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">Option 3:</span>
                <span>Use CryptoQuant/Glassnode API for institutional flow data</span>
              </div>
            </div>
          </div>

          {/* What Whale Data Provides */}
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
              🐋 Value of Whale Transaction Data:
            </div>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>• Identify institutional accumulation/distribution patterns</div>
              <div>• Early warning of major market moves</div>
              <div>• Confirm or contradict retail sentiment</div>
              <div>• Track smart money flow in real-time</div>
              <div>• Spot potential support/resistance from large players</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mock data for demonstration purposes
const mockWhaleTransactions = [
  {
    side: 'BUY' as const,
    type: 'MARKET',
    amount: 125.5,
    asset: 'BTC',
    value: 12000000,
    price: 95618,
    time: '2 min ago',
    note: 'Large market buy - potential accumulation'
  },
  {
    side: 'SELL' as const,
    type: 'LIMIT',
    amount: 89.2,
    asset: 'BTC',
    value: 8500000,
    price: 95280,
    time: '5 min ago',
    note: 'Limit sell wall placed - resistance level'
  },
  {
    side: 'BUY' as const,
    type: 'MARKET',
    amount: 2850,
    asset: 'ETH',
    value: 5200000,
    price: 1825,
    time: '8 min ago',
    note: 'Cross-market correlation play'
  },
  {
    side: 'BUY' as const,
    type: 'LIMIT',
    amount: 45.8,
    asset: 'BTC',
    value: 4300000,
    price: 93900,
    time: '12 min ago',
    note: 'Bid support at key level'
  },
  {
    side: 'SELL' as const,
    type: 'MARKET',
    amount: 32.1,
    asset: 'BTC',
    value: 3050000,
    price: 95000,
    time: '15 min ago',
    note: 'Profit taking at resistance'
  }
]
