import { checkDatabaseHealth } from '../../database/connection.js';

/**
 * Health Service
 * Provides system liveness, readiness, uptime, and service metadata
 * Conforms to docs/api-contract.md Section 14.8 & M3 Acceptance Criteria
 */

export const getSystemHealth = () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ivip-mini-backend',
    version: '0.1.0',
    uptime_seconds: Math.floor(process.uptime())
  };
};

export const getLiveness = () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      process: 'up'
    }
  };
};

export const getReadiness = async () => {
  const dbHealth = await checkDatabaseHealth();
  const isReady = dbHealth.healthy;

  return {
    status: isReady ? 'ok' : 'error',
    ready: isReady,
    timestamp: new Date().toISOString(),
    checks: {
      http: 'ready',
      database: isReady ? 'connected' : 'disconnected'
    },
    ...(isReady
      ? { database_latency_ms: dbHealth.latencyMs }
      : { error: dbHealth.error })
  };
};
