// scripts/run-signal-daemon.ts
//
// Entry point for the signal runner daemon.
// Loads config from environment variables and starts the polling loop.
// Designed to run under pm2 for 24/7 operation.

import { SignalRunner } from '@/lib/signal-runner/runner'
import type { RunnerConfig, RunnerCombo } from '@/lib/signal-runner/types'
import logger from '@/lib/logger'

function loadConfig(): RunnerConfig {
  const webhookUrl = process.env.DISCORD_SIGNAL_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error('DISCORD_SIGNAL_WEBHOOK_URL environment variable is required')
  }

  const combos: RunnerCombo[] = [
    // SOL/1h — best performer (71.4% WR, 10.25 PF)
    { strategyId: 'signal-oi-momentum-vol', symbol: 'SOLUSDT', interval: '1h' },
    { strategyId: 'signal-oi-momentum', symbol: 'SOLUSDT', interval: '1h' },
    // ETH/1h — strong performer (80.0% WR, 8.57 PF)
    { strategyId: 'signal-oi-momentum-vol', symbol: 'ETHUSDT', interval: '1h' },
    { strategyId: 'signal-oi-momentum', symbol: 'ETHUSDT', interval: '1h' },
    // BTC/4h — moderate performer
    { strategyId: 'signal-oi-momentum', symbol: 'BTCUSDT', interval: '4h' },
    { strategyId: 'signal-oi-momentum-vol', symbol: 'BTCUSDT', interval: '4h' },
  ]

  return {
    combos,
    webhookUrl,
    dailySummaryHour: parseInt(process.env.DAILY_SUMMARY_HOUR ?? '0', 10),
    barHistoryLength: parseInt(process.env.BAR_HISTORY_LENGTH ?? '100', 10),
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL ?? '10000'),
    seed: 42,
  }
}

async function main(): Promise<void> {
  const config = loadConfig()
  const runner = new SignalRunner(config)

  // Graceful shutdown on SIGINT/SIGTERM
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received')
    await runner.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.fatal({ error: err.message, stack: err.stack }, 'Uncaught exception')
    runner.stop().finally(() => process.exit(1))
  })

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason: String(reason) }, 'Unhandled rejection')
    runner.stop().finally(() => process.exit(1))
  })

  await runner.start()
  logger.info('Signal daemon running — press Ctrl+C to stop')
}

main().catch((err) => {
  logger.fatal({ error: err instanceof Error ? err.message : String(err) }, 'Signal daemon failed to start')
  process.exit(1)
})
