import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  persistToDisk,
  loadAllFromDisk,
  persistAll,
  deleteFromDisk,
  getSession,
  setSession,
  deleteSessionFromStore,
  getAllSessionsFromStore,
} from '@/lib/paper-trading/store'
import type { PaperSession } from '@/lib/paper-trading/types'

const PERSIST_DIR = 'data/paper-sessions'

function makeSession(id: string, symbol = 'SOLUSDT'): PaperSession {
  return {
    config: {
      id,
      strategyId: 'signal-oi-momentum-vol',
      symbol,
      interval: '1h',
      initialCapital: 10000,
      strategyParams: {},
      fillModel: {
        slippageModel: 'percentage',
        slippageValue: 0.01,
        feeModel: 'binance-futures',
        makerFee: 0.0002,
        takerFee: 0.0005,
        enableFunding: true,
        enableLiquidationCascade: false,
        enableDowntimeGaps: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    account: {
      equity: 10000,
      balance: 10000,
      realizedPnl: 0,
      unrealizedPnl: 0,
      margin: 0,
      maxDrawdown: 0,
      position: { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 },
    },
    trades: [],
    status: 'running',
    errors: [],
  }
}

describe('store persistence', () => {
  const testIds: string[] = []

  afterEach(async () => {
    // Cleanup test sessions
    for (const id of testIds) {
      deleteSessionFromStore(id)
      await deleteFromDisk(id).catch(() => {})
    }
    testIds.length = 0
  })

  it('persists and loads a session', async () => {
    const id = `test-persist-${Date.now()}`
    testIds.push(id)
    const session = makeSession(id)
    setSession(id, session)

    await persistToDisk(id, session)

    // Clear from memory
    deleteSessionFromStore(id)
    expect(getSession(id)).toBeUndefined()

    // Reload from disk
    const count = await loadAllFromDisk()
    expect(count).toBeGreaterThanOrEqual(1)

    const loaded = getSession(id)
    expect(loaded).toBeDefined()
    expect(loaded!.config.id).toBe(id)
    expect(loaded!.config.symbol).toBe('SOLUSDT')
  })

  it('handles atomic write (no tmp file left)', async () => {
    const id = `test-atomic-${Date.now()}`
    testIds.push(id)
    const session = makeSession(id)
    setSession(id, session)

    await persistToDisk(id, session)

    const files = await fs.readdir(PERSIST_DIR)
    const tmpFiles = files.filter(f => f.includes(id) && f.endsWith('.tmp'))
    expect(tmpFiles).toHaveLength(0)

    const jsonFiles = files.filter(f => f.includes(id) && f.endsWith('.json'))
    expect(jsonFiles).toHaveLength(1)
  })

  it('persistAll writes all in-memory sessions', async () => {
    const id1 = `test-all-1-${Date.now()}`
    const id2 = `test-all-2-${Date.now()}`
    testIds.push(id1, id2)

    setSession(id1, makeSession(id1, 'SOLUSDT'))
    setSession(id2, makeSession(id2, 'ETHUSDT'))

    await persistAll()

    // Both should be on disk
    const f1 = path.join(PERSIST_DIR, `${id1}.json`)
    const f2 = path.join(PERSIST_DIR, `${id2}.json`)
    await expect(fs.access(f1)).resolves.toBeUndefined()
    await expect(fs.access(f2)).resolves.toBeUndefined()
  })

  it('deleteFromDisk removes the file', async () => {
    const id = `test-delete-${Date.now()}`
    testIds.push(id)
    const session = makeSession(id)
    setSession(id, session)
    await persistToDisk(id, session)

    const target = path.join(PERSIST_DIR, `${id}.json`)
    await expect(fs.access(target)).resolves.toBeUndefined()

    await deleteFromDisk(id)
    await expect(fs.access(target)).rejects.toThrow()
  })

  it('skips corrupt files during load', async () => {
    // Write a corrupt JSON file
    const corruptId = `test-corrupt-${Date.now()}`
    testIds.push(corruptId)
    const corruptPath = path.join(PERSIST_DIR, `${corruptId}.json`)
    await fs.mkdir(PERSIST_DIR, { recursive: true })
    await fs.writeFile(corruptPath, '{ invalid json')

    // Should not throw, just skip
    const count = await loadAllFromDisk()
    expect(typeof count).toBe('number')
  })

  it('skips tmp files during load (crash recovery)', async () => {
    const tmpId = `test-tmp-${Date.now()}`
    testIds.push(tmpId)
    const tmpPath = path.join(PERSIST_DIR, `${tmpId}.json.tmp`)
    await fs.mkdir(PERSIST_DIR, { recursive: true })
    await fs.writeFile(tmpPath, '{"config":{"id":"tmp"}}')

    await loadAllFromDisk()
    // The tmp file should not be loaded as a session
    expect(getSession(tmpId)).toBeUndefined()

    // Cleanup tmp file
    await fs.unlink(tmpPath).catch(() => {})
  })
})
