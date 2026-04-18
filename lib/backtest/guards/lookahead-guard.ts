import type { Bar, StrategyContext } from '../types/strategy'

/**
 * Wraps the StrategyContext's getBar method to prevent look-ahead bias.
 * Returns undefined for any bar index > currentIndex.
 */
export class LookaheadGuard {
  private accessedIndices = new Set<number>()
  private violations: string[] = []
  private enabled: boolean

  constructor(enabled: boolean = true) {
    this.enabled = enabled
  }

  /**
   * Create a guarded getBar function that blocks future access.
   */
  createGuardedGetBar(bars: readonly Bar[], currentIndex: number): (offset: number) => Bar | undefined {
    return (offset: number): Bar | undefined => {
      const targetIndex = currentIndex + offset

      if (this.enabled && targetIndex > currentIndex) {
        const violation = `Look-ahead detected: tried to access bar at index ${targetIndex} (current: ${currentIndex})`
        this.violations.push(violation)
        // Return undefined instead of throwing — strategies should handle gracefully
        return undefined
      }

      if (targetIndex < 0 || targetIndex >= bars.length) {
        return undefined
      }

      this.accessedIndices.add(targetIndex)
      return bars[targetIndex]
    }
  }

  /**
   * Get any look-ahead violations detected.
   */
  getViolations(): string[] {
    return [...this.violations]
  }

  /**
   * Check if any look-ahead was detected.
   */
  hasViolations(): boolean {
    return this.violations.length > 0
  }

  /**
   * Get the set of bar indices that were accessed.
   */
  getAccessedIndices(): Set<number> {
    return new Set(this.accessedIndices)
  }

  /**
   * Reset state for a new backtest run.
   */
  reset(): void {
    this.accessedIndices.clear()
    this.violations = []
  }
}
