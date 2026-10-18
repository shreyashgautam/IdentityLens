import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

/**
 * Build pool configuration from environment
 */
export const buildPoolConfig = (overrides = {}) => {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      ...overrides
    };
  }

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
    ...overrides
  };
};

/**
 * Singleton PostgreSQL Connection Pool
 * Conforms to docs/architecture.md Section 7.15 & security/secure-development.md Section 8
 */
export const pool = new Pool(buildPoolConfig());

// Handle unexpected idle client errors without exiting process ungracefully
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Unexpected idle client failure:', err.message);
});

/**
 * Execute parameterized query using the connection pool
 * @param {string} text - Parameterized SQL string ($1, $2, ...)
 * @param {Array} params - Array of parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (err) {
    console.error(`[Database Query Error] ${err.message}`);
    throw err;
  }
};

/**
 * Check out a dedicated client from the pool for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Lightweight Database Health Check
 * Used by readiness probe /health/ready without exposing credentials
 * @returns {Promise<{ healthy: boolean, latencyMs: number, database?: string, error?: string }>}
 */
export const checkDatabaseHealth = async () => {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 AS alive, current_database() AS db_name');
    const latencyMs = Date.now() - start;
    return {
      healthy: true,
      latencyMs,
      database: res.rows[0]?.db_name || env.DB_NAME
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      healthy: false,
      latencyMs,
      error: 'Database connection failed or timed out'
    };
  }
};

/**
 * Gracefully close the connection pool during shutdown
 */
export const closePool = async () => {
  await pool.end();
};
