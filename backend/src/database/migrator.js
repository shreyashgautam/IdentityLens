import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, getClient } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Unique 64-bit integer advisory lock key for IdentityLens migrations
const MIGRATION_LOCK_ID = 894382741;

/**
 * Migration Runner
 * Conforms to docs/data-model.md Section 9 & M3 Acceptance Criteria
 * Supports programmatic execution and CLI invocation.
 *
 * @param {Object} options - Optional config or client
 * @returns {Promise<{ applied: string[], total: number }>}
 */
export const runMigrations = async (customClient = null) => {
  const client = customClient || (await getClient());
  const ownClient = !customClient;
  const applied = [];

  try {
    // 1. Acquire transactional advisory lock to prevent concurrent migration collisions
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    // 2. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Fetch already applied migration versions
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(rows.map((r) => r.version));

    // 4. Read all .sql files from migrations directory
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    // 5. Apply each pending migration inside an isolated transaction
    for (const file of sqlFiles) {
      const version = file.split('_')[0];

      if (appliedVersions.has(version)) {
        continue;
      }

      console.log(`[Database Migrator] Applying migration: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = await fs.readFile(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [version, file]
        );
        await client.query('COMMIT');
        applied.push(file);
        console.log(`[Database Migrator] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Database Migrator] Failed to apply ${file}: ${err.message}`);
        throw err;
      }
    }

    if (applied.length === 0) {
      console.log('[Database Migrator] Database schema is up to date. No pending migrations.');
    } else {
      console.log(`[Database Migrator] Migrations complete. Applied ${applied.length} migration(s).`);
    }

    return { applied, total: sqlFiles.length };
  } finally {
    // Always release the advisory lock
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } catch (e) {
      // Ignore unlock errors during teardown
    }

    if (ownClient) {
      client.release();
    }
  }
};

// If executed directly from CLI: node src/database/migrator.js
if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Database Migrator Fatal Error]', err.message);
      await pool.end();
      process.exit(1);
    });
}
