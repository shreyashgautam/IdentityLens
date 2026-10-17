/**
 * Health Service
 * Provides system liveness, timestamp, and service metadata
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
