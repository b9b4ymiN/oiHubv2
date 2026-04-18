import type { PaperSession } from './types'

const sessions = new Map<string, PaperSession>()

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
