// lib/logger.ts
//
// This file is Node-only. Do NOT import from edge routes.
// Edge routes (app/api/options/professional, app/api/options/volume-iv) use console.log directly.
// Use process.env.LOG_LEVEL for level control.

import pino from 'pino'

const redactPaths = [
  'apiKey',
  'apiSecret',
  'signature',
  'X-MBX-APIKEY',
  'password',
  'token',
  'headers.X-MBX-APIKEY',
  'url',
]

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})

export function createLogger(context: Record<string, string>) {
  return logger.child(context)
}

export default logger
