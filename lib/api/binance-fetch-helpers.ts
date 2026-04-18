/**
 * Functional fetch helpers for Binance API — edge-compatible
 *
 * No Node.js-only dependencies (no crypto).
 * Safe to import from edge runtime routes.
 */

import {
  BinanceApiError,
  NetworkError,
  TimeoutError,
  UnknownError,
  classifyHttpResponse,
  isRetryable,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from './binance-errors'

/**
 * Classify a fetch/abort error into a typed BinanceApiError
 */
export function classifyError(error: unknown, url?: string): BinanceApiError {
  if (error instanceof BinanceApiError) return error

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new TimeoutError({ url })
  }

  if (error instanceof TypeError) {
    return new NetworkError({ message: error.message, cause: error })
  }

  if (error instanceof Error) {
    return new UnknownError({ message: error.message, cause: error })
  }

  return new UnknownError({ message: String(error) })
}

/**
 * Sleep with jitter for retry backoff
 */
function sleepWithBackoff(attempt: number, config: RetryConfig): Promise<void> {
  const baseDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  )
  const jitter = baseDelay * config.jitterFactor * (Math.random() * 2 - 1)
  const delay = Math.max(0, Math.round(baseDelay + jitter))

  return new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Fetch with retry, timeout, and error classification
 *
 * Pure function — safe for both Edge and Node.js runtimes.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryConfig?: Partial<RetryConfig>,
  timeoutMs?: number
): Promise<any> {
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  const timeout = timeoutMs ?? 30000

  let lastError: BinanceApiError | undefined

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const body = await response.text()
        const error = classifyHttpResponse({
          status: response.status,
          body,
        })

        if (!isRetryable(error) || attempt >= config.maxAttempts - 1) {
          throw error
        }

        lastError = error
        await sleepWithBackoff(attempt, config)
        continue
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      const classified = classifyError(error, url)

      if (!isRetryable(classified) || attempt >= config.maxAttempts - 1) {
        throw classified
      }

      lastError = classified
      await sleepWithBackoff(attempt, config)
    }
  }

  throw lastError ?? new UnknownError({ message: 'Max retry attempts exhausted' })
}

export { DEFAULT_RETRY_CONFIG }
export type { RetryConfig }
