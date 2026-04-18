import type { Strategy, StrategyMetadata, ParamDef } from './types/strategy'

class StrategyRegistry {
  private strategies = new Map<string, Strategy>()

  register(strategy: Strategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`Strategy already registered: ${strategy.id}`)
    }
    this.strategies.set(strategy.id, strategy)
  }

  get(strategyId: string): Strategy {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyId}. Available: ${this.listIds().join(', ')}`)
    }
    return strategy
  }

  listIds(): string[] {
    return Array.from(this.strategies.keys())
  }

  listStrategies(): StrategyMetadata[] {
    return Array.from(this.strategies.values()).map(s => ({
      id: s.id,
      version: s.version,
      name: s.name,
      description: s.description,
      paramSchema: {}, // Will be populated by each strategy
    }))
  }

  has(strategyId: string): boolean {
    return this.strategies.has(strategyId)
  }

  clear(): void {
    this.strategies.clear()
  }
}

// Singleton
let instance: StrategyRegistry | null = null

export function getStrategyRegistry(): StrategyRegistry {
  if (!instance) {
    instance = new StrategyRegistry()
  }
  return instance
}
