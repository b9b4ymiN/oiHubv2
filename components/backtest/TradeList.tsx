'use client'

import { useState } from 'react'
import type { Trade } from '@/lib/backtest/types/trade'

interface TradeListProps {
  trades: Trade[]
  initialCapital: number
}

type SortField = 'timestamp' | 'side' | 'price' | 'size' | 'pnl' | 'reason'
type SortOrder = 'asc' | 'desc'
type SideFilter = 'all' | 'buy' | 'sell'

const TRADES_PER_PAGE = 50

export function TradeList({ trades, initialCapital }: TradeListProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [sideFilter, setSideFilter] = useState<SideFilter>('all')
  const [searchReason, setSearchReason] = useState('')
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    if (sideFilter !== 'all' && trade.side !== sideFilter) return false
    if (searchReason && !trade.reason.toLowerCase().includes(searchReason.toLowerCase())) return false
    return true
  })

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'timestamp':
        comparison = a.timestamp - b.timestamp
        break
      case 'side':
        comparison = a.side.localeCompare(b.side)
        break
      case 'price':
        comparison = a.price - b.price
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'pnl':
        comparison = a.pnl - b.pnl
        break
      case 'reason':
        comparison = a.reason.localeCompare(b.reason)
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Paginate
  const totalPages = Math.ceil(sortedTrades.length / TRADES_PER_PAGE)
  const startIndex = currentPage * TRADES_PER_PAGE
  const paginatedTrades = sortedTrades.slice(startIndex, startIndex + TRADES_PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const formatPnL = (pnl: number) => {
    const color = pnl >= 0 ? 'text-green-400' : 'text-red-400'
    const sign = pnl >= 0 ? '+' : ''
    return <span className={color}>{sign}${pnl.toFixed(2)}</span>
  }

  const formatPnLPercent = (pnl: number) => {
    const percent = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0
    const color = percent >= 0 ? 'text-green-400' : 'text-red-400'
    const sign = percent >= 0 ? '+' : ''
    return <span className={color}>{sign}{percent.toFixed(2)}%</span>
  }

  const formatSide = (side: 'buy' | 'sell') => {
    const color = side === 'buy' ? 'text-green-400' : 'text-red-400'
    const label = side === 'buy' ? 'BUY' : 'SELL'
    return <span className={`font-semibold ${color}`}>{label}</span>
  }

  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trade History</h3>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Side:</label>
          <select
            value={sideFilter}
            onChange={(e) => {
              setSideFilter(e.target.value as SideFilter)
              setCurrentPage(0)
            }}
            className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Reason:</label>
          <input
            type="text"
            value={searchReason}
            onChange={(e) => {
              setSearchReason(e.target.value)
              setCurrentPage(0)
            }}
            placeholder="Search reason..."
            className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm w-48"
          />
        </div>

        <div className="text-gray-400 text-sm ml-auto">
          Showing {paginatedTrades.length} of {sortedTrades.length} trades
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th
                className="text-left text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('timestamp')}
              >
                #{getSortIndicator('timestamp')}
              </th>
              <th
                className="text-left text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('timestamp')}
              >
                Date{getSortIndicator('timestamp')}
              </th>
              <th
                className="text-left text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('side')}
              >
                Side{getSortIndicator('side')}
              </th>
              <th
                className="text-right text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('price')}
              >
                Price{getSortIndicator('price')}
              </th>
              <th
                className="text-right text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('size')}
              >
                Size{getSortIndicator('size')}
              </th>
              <th
                className="text-right text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('pnl')}
              >
                PnL{getSortIndicator('pnl')}
              </th>
              <th className="text-right text-gray-400 text-sm py-2 px-3">PnL%</th>
              <th
                className="text-left text-gray-400 text-sm py-2 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('reason')}
              >
                Reason{getSortIndicator('reason')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">
                  No trades found
                </td>
              </tr>
            ) : (
              paginatedTrades.map((trade, index) => (
                <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 px-3 text-gray-400 text-sm">{startIndex + index + 1}</td>
                  <td className="py-2 px-3 text-gray-300 text-sm">
                    {new Date(trade.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-sm">{formatSide(trade.side)}</td>
                  <td className="py-2 px-3 text-right text-gray-300 text-sm">
                    ${trade.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-300 text-sm">
                    {trade.size.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-right text-sm">{formatPnL(trade.pnl)}</td>
                  <td className="py-2 px-3 text-right text-sm">{formatPnLPercent(trade.pnl)}</td>
                  <td className="py-2 px-3 text-gray-400 text-sm">{trade.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Previous
          </button>

          <div className="text-gray-400 text-sm">
            Page {currentPage + 1} of {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
