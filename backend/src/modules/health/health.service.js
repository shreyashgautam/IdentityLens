/**
 * Health Service
 * Provides system liveness, readiness, uptime, and service metadata
 * Conforms to docs/api-contract.md Section 14.8 & M2 Acceptance Criteria
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

export const getReadiness = () => {
  // In M2, database connectivity is not yet introduced (scheduled for M3).
  // Readiness signals that Express HTTP listener and routing are fully initialized.
  return {
    status: 'ok',
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      http: 'ready',
      database: 'pending_m3'
    }
  };
};
