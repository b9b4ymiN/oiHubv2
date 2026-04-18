'use client'

import { useState, useEffect } from 'react'

interface QualityBadgeProps {
  symbol: string
  dataTypes?: string[]
}

interface QualityData {
  summary: {
    overallScore: number
  }
}

export function QualityBadge({ symbol, dataTypes }: QualityBadgeProps) {
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchQuality(): Promise<void> {
      try {
        const params = new URLSearchParams()
        if (dataTypes) {
          params.set('dataTypes', dataTypes.join(','))
        }
        const response = await fetch(`/api/admin/quality/${symbol}?${params}`)
        if (response.ok && !cancelled) {
          const result = await response.json()
          setScore(result.data?.summary?.overallScore ?? null)
        }
      } catch {
        if (!cancelled) {
          setScore(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchQuality()

    return () => {
      cancelled = true
    }
  }, [symbol, dataTypes])

  if (loading) {
    return <span className="inline-block w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
  }

  if (score === null) {
    return (
      <span className="inline-block w-3 h-3 rounded-full bg-gray-300" title="Quality unknown" />
    )
  }

  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={`Data quality: ${score}/100`} />
  )
}
