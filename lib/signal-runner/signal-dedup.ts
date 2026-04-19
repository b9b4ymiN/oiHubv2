// lib/signal-runner/signal-dedup.ts
//
// Intent-aware signal deduplication.
// Tracks {sessionId, barTimestamp, intentKind} to prevent duplicate alerts
// within the same bar. NOT using AlertManager dedup which is rule-based.

export class SignalDedup {
  private seen = new Map<string, number>() // key → barTimestamp

  private makeKey(sessionId: string, barTimestamp: number, intentKind: string): string {
    return `${sessionId}:${barTimestamp}:${intentKind}`
  }

  isDuplicate(sessionId: string, barTimestamp: number, intentKind: string): boolean {
    return this.seen.has(this.makeKey(sessionId, barTimestamp, intentKind))
  }

  record(sessionId: string, barTimestamp: number, intentKind: string): void {
    this.seen.set(this.makeKey(sessionId, barTimestamp, intentKind), barTimestamp)
  }

  prune(currentTimestamp: number): void {
    // Remove entries older than current bar (keep current hour for safety)
    for (const [key, ts] of this.seen) {
      if (ts < currentTimestamp) {
        this.seen.delete(key)
      }
    }
  }

  clear(): void {
    this.seen.clear()
  }

  get size(): number {
    return this.seen.size
  }
}
