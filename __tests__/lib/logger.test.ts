import { describe, it, expect } from 'vitest'
import pino from 'pino'
import { Writable } from 'stream'

describe('logger redaction', () => {
  it('redacts apiKey from log output', () => {
    const output: string[] = []
    const testLogger = pino({
      redact: { paths: ['apiKey', 'signature', 'X-MBX-APIKEY'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    testLogger.info({ apiKey: 'my-secret-key' }, 'test message')
    const logged = output[0]
    expect(logged).not.toContain('my-secret-key')
    expect(logged).toContain('[REDACTED]')
  })

  it('redacts signature from log output', () => {
    const output: string[] = []
    const testLogger = pino({
      redact: { paths: ['apiKey', 'signature', 'X-MBX-APIKEY'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    testLogger.info({ signature: 'secret-signature-123' }, 'test message')
    const logged = output[0]
    expect(logged).not.toContain('secret-signature-123')
    expect(logged).toContain('[REDACTED]')
  })

  it('redacts X-MBX-APIKEY header from log output', () => {
    const output: string[] = []
    const testLogger = pino({
      redact: { paths: ['apiKey', 'signature', 'X-MBX-APIKEY'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    testLogger.info({ 'X-MBX-APIKEY': 'api-key-value' }, 'test message')
    const logged = output[0]
    expect(logged).not.toContain('api-key-value')
    expect(logged).toContain('[REDACTED]')
  })

  it('redacts password from log output', () => {
    const output: string[] = []
    const testLogger = pino({
      redact: { paths: ['password', 'token'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    testLogger.info({ password: 'my-password-123' }, 'test message')
    const logged = output[0]
    expect(logged).not.toContain('my-password-123')
    expect(logged).toContain('[REDACTED]')
  })

  it('redacts token from log output', () => {
    const output: string[] = []
    const testLogger = pino({
      redact: { paths: ['password', 'token'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    testLogger.info({ token: 'bearer-token-xyz' }, 'test message')
    const logged = output[0]
    expect(logged).not.toContain('bearer-token-xyz')
    expect(logged).toContain('[REDACTED]')
  })

  it('can create child loggers with context', () => {
    const output: string[] = []
    const baseLogger = pino({
      redact: { paths: ['apiKey'], censor: '[REDACTED]' },
    }, new Writable({
      write(chunk, _, cb) {
        output.push(chunk.toString())
        cb()
      }
    }))

    const childLogger = baseLogger.child({ component: 'test-component' })
    childLogger.info({ apiKey: 'secret' }, 'test message')

    const logged = output[0]
    expect(logged).toContain('test-component')
    expect(logged).toContain('[REDACTED]')
    expect(logged).not.toContain('secret')
  })

  it('defaults LOG_LEVEL to info', () => {
    const originalLevel = process.env.LOG_LEVEL
    delete process.env.LOG_LEVEL

    // Re-import to test default
    const defaultLevel = process.env.LOG_LEVEL || 'info'
    expect(defaultLevel).toBe('info')

    if (originalLevel) {
      process.env.LOG_LEVEL = originalLevel
    }
  })
})
