import type { PaperSession } from './types'
import * as fs from 'fs/promises'
import * as path from 'path'
import logger from '@/lib/logger'

const PERSIST_DIR = 'data/paper-sessions'
const sessions = new Map<string, PaperSession>()

// ─── In-memory operations (unchanged API) ───────────────────────────

export function getSession(id: string): PaperSession | undefined {
  return sessions.get(id)
}

export function setSession(id: string, session: PaperSession): void {
  sessions.set(id, session)
}

export function deleteSessionFromStore(id: string): void {
  sessions.delete(id)
}

export function getAllSessionsFromStore(): PaperSession[] {
  return Array.from(sessions.values())
}

export function hasSession(id: string): boolean {
  return sessions.has(id)
}

// ─── Atomic file persistence ────────────────────────────────────────

export async function persistToDisk(id: string, session: PaperSession): Promise<void> {
  try {
    await fs.mkdir(PERSIST_DIR, { recursive: true })
    const tmp = path.join(PERSIST_DIR, `${id}.json.tmp`)
    const target = path.join(PERSIST_DIR, `${id}.json`)
    await fs.writeFile(tmp, JSON.stringify(session, null, 2))
    await fs.rename(tmp, target)
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : String(err) }, `Failed to persist session ${id}`)
  }
}

export async function deleteFromDisk(id: string): Promise<void> {
  try {
    const target = path.join(PERSIST_DIR, `${id}.json`)
    await fs.unlink(target).catch(() => {})
  } catch {
    // File may not exist, ignore
  }
}

export async function loadAllFromDisk(): Promise<number> {
  try {
    await fs.mkdir(PERSIST_DIR, { recursive: true })
    const files = await fs.readdir(PERSIST_DIR)
    let loaded = 0

    for (const file of files) {
      // Skip temp files (crash recovery)
      if (file.endsWith('.tmp')) continue
      if (!file.endsWith('.json')) continue

      try {
        const filePath = path.join(PERSIST_DIR, file)
        const content = await fs.readFile(filePath, 'utf8')
        const session: PaperSession = JSON.parse(content)
        sessions.set(session.config.id, session)
        loaded++
      } catch (err) {
        logger.warn({ file, error: err instanceof Error ? err.message : String(err) }, 'Skipping corrupt session file')
      }
    }

    return loaded
  } catch {
    return 0
  }
}

// Persist all sessions (used on graceful shutdown)
export async function persistAll(): Promise<void> {
  for (const [id, session] of sessions) {
    await persistToDisk(id, session)
  }
}
