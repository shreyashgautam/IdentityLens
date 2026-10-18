import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, checkDatabaseHealth, closePool } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrator.js';

describe('Milestone 3 — Database Foundation & Schema Integrity', () => {
  before(async () => {
    // Ensure migrations are executed before running database tests
    await runMigrations();
  });

  after(async () => {
    // Clean up test records
    try {
      await query("DELETE FROM applications WHERE key LIKE 'test_%'");
      await query("DELETE FROM identities WHERE email LIKE '%@test-domain.com'");
    } catch (e) {
      // Ignore cleanup error
    }
    await closePool();
  });

  test('Database connection pool executes parameterized queries', async () => {
    const res = await query('SELECT $1::int + $2::int AS total', [15, 27]);
    assert.equal(res.rows[0].total, 42);
  });

  test('checkDatabaseHealth reports live database connectivity without credentials', async () => {
    const health = await checkDatabaseHealth();
    assert.equal(health.healthy, true);
    assert.ok(typeof health.latencyMs === 'number');
    assert.ok(health.database);
    assert.equal(health.error, undefined);
  });

  test('All six core domain tables exist in PostgreSQL schema', async () => {
    const res = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'identities',
          'applications',
          'accounts',
          'entitlements',
          'account_entitlements',
          'risk_findings',
          'schema_migrations'
        )
      ORDER BY table_name ASC;
    `);

    const tableNames = res.rows.map((r) => r.table_name);
    assert.ok(tableNames.includes('identities'));
    assert.ok(tableNames.includes('applications'));
    assert.ok(tableNames.includes('accounts'));
    assert.ok(tableNames.includes('entitlements'));
    assert.ok(tableNames.includes('account_entitlements'));
    assert.ok(tableNames.includes('risk_findings'));
    assert.ok(tableNames.includes('schema_migrations'));
  });

  test('Identity table enforces self-ownership check constraint', async () => {
    // 1. Insert valid identity
    const insertRes = await query(`
      INSERT INTO identities (display_name, identity_type, email, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, ['Test User', 'human', 'test-user@test-domain.com', 'active']);

    const identityId = insertRes.rows[0].id;
    assert.ok(identityId);

    // 2. Attempt self-ownership (chk_identities_not_self_owner)
    await assert.rejects(
      async () => {
        await query('UPDATE identities SET owner_id = $1 WHERE id = $1', [identityId]);
      },
      (err) => {
        assert.ok(err.message.includes('chk_identities_not_self_owner'));
        return true;
      }
    );
  });

  test('Applications table enforces unique application key constraint', async () => {
    const appKey = `test_app_${Date.now()}`;

    // 1. Insert application
    await query(`
      INSERT INTO applications (name, key, description)
      VALUES ($1, $2, $3);
    `, ['Test App 1', appKey, 'Primary test target app']);

    // 2. Attempt duplicate key insertion
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO applications (name, key, description)
          VALUES ($1, $2, $3);
        `, ['Test App Duplicate', appKey, 'Duplicate app key']);
      },
      (err) => {
        assert.ok(err.code === '23505', 'Should throw unique_violation error');
        return true;
      }
    );
  });

  test('Accounts table rejects foreign key to non-existent application', async () => {
    const nonExistentAppId = '00000000-0000-0000-0000-000000000000';

    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO accounts (application_id, external_id, account_name)
          VALUES ($1, $2, $3);
        `, [nonExistentAppId, 'ext-user-999', 'invalid-account']);
      },
      (err) => {
        assert.ok(err.code === '23503', 'Should throw foreign_key_violation error');
        return true;
      }
    );
  });

  test('Accounts table enforces unique (application_id, external_id) constraint', async () => {
    const appKey = `test_app_unique_${Date.now()}`;
    const appRes = await query(`
      INSERT INTO applications (name, key, description)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, ['Unique Check App', appKey, 'Test app for account uniqueness']);
    const appId = appRes.rows[0].id;

    // Insert first account
    await query(`
      INSERT INTO accounts (application_id, external_id, account_name)
      VALUES ($1, $2, $3);
    `, [appId, 'ext-usr-101', 'account-primary']);

    // Attempt duplicate (appId, external_id)
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO accounts (application_id, external_id, account_name)
          VALUES ($1, $2, $3);
        `, [appId, 'ext-usr-101', 'account-duplicate']);
      },
      (err) => {
        assert.ok(err.code === '23505', 'Should throw unique_violation error');
        return true;
      }
    );
  });

  test('Risk findings table enforces entity reference constraint', async () => {
    // Attempt inserting finding with BOTH identity_id and account_id as NULL
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO risk_findings (rule_code, severity, title, description)
          VALUES ($1, $2, $3, $4);
        `, ['ORPHAN_ACCOUNT', 'high', 'Invalid Finding', 'No entity linked']);
      },
      (err) => {
        assert.ok(err.message.includes('chk_risk_findings_entity_ref'));
        return true;
      }
    );
  });
});
