import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerHealthCheck,
  unregisterHealthCheck,
  getRegisteredChecks,
  runHealthCheck,
  runAllChecks,
  clearHealthChecks,
} from '@/lib/observability/health';

describe('health checks', () => {
  beforeEach(() => {
    clearHealthChecks();
  });

  describe('registerHealthCheck', () => {
    it('registers a health check', () => {
      registerHealthCheck({
        name: 'test',
        critical: true,
        check: async () => ({
          name: 'test',
          status: 'healthy',
          latencyMs: 0,
          timestamp: Date.now(),
        }),
      });

      expect(getRegisteredChecks()).toContain('test');
    });
  });

  describe('unregisterHealthCheck', () => {
    it('removes a health check', () => {
      registerHealthCheck({
        name: 'test',
        critical: true,
        check: async () => ({ name: 'test', status: 'healthy', latencyMs: 0, timestamp: Date.now() }),
      });
      unregisterHealthCheck('test');
      expect(getRegisteredChecks()).not.toContain('test');
    });
  });

  describe('runHealthCheck', () => {
    it('returns healthy result', async () => {
      registerHealthCheck({
        name: 'db',
        critical: true,
        check: async () => ({ name: 'db', status: 'healthy', latencyMs: 0, timestamp: Date.now() }),
      });

      const result = await runHealthCheck('db');
      expect(result?.status).toBe('healthy');
      expect(result?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns unhealthy on exception', async () => {
      registerHealthCheck({
        name: 'fail',
        critical: true,
        check: async () => { throw new Error('connection refused'); },
      });

      const result = await runHealthCheck('fail');
      expect(result?.status).toBe('unhealthy');
      expect(result?.message).toContain('connection refused');
    });

    it('returns null for unknown check', async () => {
      expect(await runHealthCheck('nonexistent')).toBeNull();
    });
  });

  describe('runAllChecks', () => {
    it('returns healthy when all checks pass', async () => {
      registerHealthCheck({
        name: 'check1',
        critical: true,
        check: async () => ({ name: 'check1', status: 'healthy', latencyMs: 0, timestamp: Date.now() }),
      });

      const health = await runAllChecks();
      expect(health.status).toBe('healthy');
      expect(health.checks).toHaveLength(1);
      expect(health.version).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
    });

    it('returns unhealthy when critical check fails', async () => {
      registerHealthCheck({
        name: 'critical',
        critical: true,
        check: async () => ({ name: 'critical', status: 'unhealthy', latencyMs: 0, timestamp: Date.now() }),
      });

      const health = await runAllChecks();
      expect(health.status).toBe('unhealthy');
    });

    it('returns degraded when non-critical check fails', async () => {
      registerHealthCheck({
        name: 'optional',
        critical: false,
        check: async () => ({ name: 'optional', status: 'unhealthy', latencyMs: 0, timestamp: Date.now() }),
      });

      const health = await runAllChecks();
      expect(health.status).toBe('degraded');
    });

    it('returns degraded when check reports degraded', async () => {
      registerHealthCheck({
        name: 'degraded',
        critical: true,
        check: async () => ({ name: 'degraded', status: 'degraded', latencyMs: 0, timestamp: Date.now() }),
      });

      const health = await runAllChecks();
      expect(health.status).toBe('degraded');
    });

    it('returns unhealthy if both critical and non-critical fail', async () => {
      registerHealthCheck({
        name: 'critical',
        critical: true,
        check: async () => ({ name: 'critical', status: 'unhealthy', latencyMs: 0, timestamp: Date.now() }),
      });
      registerHealthCheck({
        name: 'optional',
        critical: false,
        check: async () => ({ name: 'optional', status: 'unhealthy', latencyMs: 0, timestamp: Date.now() }),
      });

      const health = await runAllChecks();
      expect(health.status).toBe('unhealthy');
    });
  });
});
