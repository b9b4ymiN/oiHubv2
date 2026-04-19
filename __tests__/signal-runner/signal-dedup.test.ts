import { describe, it, expect } from 'vitest'
import { SignalDedup } from '@/lib/signal-runner/signal-dedup'

describe('SignalDedup', () => {
  it('records and detects duplicates', () => {
    const dedup = new SignalDedup()
    expect(dedup.isDuplicate('sess1', 1000, 'enter_long')).toBe(false)
    dedup.record('sess1', 1000, 'enter_long')
    expect(dedup.isDuplicate('sess1', 1000, 'enter_long')).toBe(true)
  })

  it('different sessions are independent', () => {
    const dedup = new SignalDedup()
    dedup.record('sess1', 1000, 'enter_long')
    expect(dedup.isDuplicate('sess2', 1000, 'enter_long')).toBe(false)
  })

  it('different intent kinds are independent', () => {
    const dedup = new SignalDedup()
    dedup.record('sess1', 1000, 'enter_long')
    expect(dedup.isDuplicate('sess1', 1000, 'exit_all')).toBe(false)
  })

  it('prunes old entries', () => {
    const dedup = new SignalDedup()
    dedup.record('sess1', 1000, 'enter_long')
    dedup.prune(2000)
    expect(dedup.isDuplicate('sess1', 1000, 'enter_long')).toBe(false)
  })

  it('keeps current timestamp entries during prune', () => {
    const dedup = new SignalDedup()
    dedup.record('sess1', 1000, 'enter_long')
    dedup.prune(1000)
    expect(dedup.isDuplicate('sess1', 1000, 'enter_long')).toBe(true)
  })

  it('clear removes all entries', () => {
    const dedup = new SignalDedup()
    dedup.record('sess1', 1000, 'enter_long')
    dedup.record('sess2', 2000, 'enter_short')
    dedup.clear()
    expect(dedup.size).toBe(0)
    expect(dedup.isDuplicate('sess1', 1000, 'enter_long')).toBe(false)
  })

  it('reports correct size', () => {
    const dedup = new SignalDedup()
    expect(dedup.size).toBe(0)
    dedup.record('sess1', 1000, 'enter_long')
    expect(dedup.size).toBe(1)
    dedup.record('sess1', 1000, 'exit_all')
    expect(dedup.size).toBe(2)
  })
})
