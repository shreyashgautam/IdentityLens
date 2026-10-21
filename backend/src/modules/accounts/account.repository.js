import { query } from '../../database/connection.js';
import { ALLOWED_SORT_FIELDS } from './account.validation.js';

/**
 * Account Repository
 * Owns all database interactions and parameterized SQL for the accounts table.
 * Conforms to docs/architecture.md Section 7.12 & docs/data-model.md Section 3.3
 */

/**
 * Find accounts with pagination, filtering, search, and sorting
 *
 * @param {Object} options
 * @param {Object} options.filters - Optional exact filters (application_id, identity_id, status, is_orphan)
 * @param {string} options.search - Optional search string across external_id, account_name, email
 * @param {string} options.sortBy - Allowlisted sort column
 * @param {string} options.sortOrder - 'asc' or 'desc'
 * @param {number} options.limit - Number of rows to return
 * @param {number} options.offset - Starting offset
 * @returns {Promise<{ rows: Array, total: number }>}
 */
export const findAndCount = async ({
  filters = {},
  search = null,
  sortBy = 'created_at',
  sortOrder = 'desc',
  limit = 20,
  offset = 0
}) => {
  const whereClauses = [];
  const params = [];

  // 1. Exact match filters
  if (filters.application_id) {
    params.push(filters.application_id);
    whereClauses.push(`application_id = $${params.length}`);
  }

  if (filters.identity_id) {
    params.push(filters.identity_id);
    whereClauses.push(`identity_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`status = $${params.length}`);
  }

  // 2. Orphan account filter (identity_id IS NULL / IS NOT NULL)
  if (typeof filters.is_orphan === 'boolean') {
    if (filters.is_orphan) {
      whereClauses.push('identity_id IS NULL');
    } else {
      whereClauses.push('identity_id IS NOT NULL');
    }
  }

  // 3. Search filter across external_id, account_name, and email
  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const searchIdx = params.length;
    whereClauses.push(`(
      external_id ILIKE $${searchIdx} OR
      account_name ILIKE $${searchIdx} OR
      email ILIKE $${searchIdx}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 4. Count total matching rows
  const countSql = `SELECT COUNT(*)::int AS total FROM accounts ${whereSql};`;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  // 5. Validate sort column against allowlist (defense-in-depth against SQL injection)
  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // 6. Query matching rows with pagination and stable secondary sort (id ASC)
  const queryParams = [...params];
  queryParams.push(limit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataSql = `
    SELECT 
      id,
      application_id,
      identity_id,
      external_id,
      account_name,
      email,
      status,
      source,
      last_login_at,
      created_at,
      updated_at
    FROM accounts
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}, id ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const dataResult = await query(dataSql, queryParams);

  return {
    rows: dataResult.rows,
    total
  };
};

/**
 * Find a single account by primary key ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const sql = `
    SELECT 
      id,
      application_id,
      identity_id,
      external_id,
      account_name,
      email,
      status,
      source,
      last_login_at,
      created_at,
      updated_at
    FROM accounts
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Find an account by (application_id, external_id) composite key
 *
 * @param {string} applicationId - UUID
 * @param {string} externalId - String
 * @returns {Promise<Object|null>}
 */
export const findByAppAndExternalId = async (applicationId, externalId) => {
  const sql = `
    SELECT id, application_id, external_id
    FROM accounts
    WHERE application_id = $1 AND external_id = $2;
  `;
  const result = await query(sql, [applicationId, externalId]);
  return result.rows[0] || null;
};

/**
 * Insert a new account record into PostgreSQL
 *
 * @param {Object} data - Account creation parameters
 * @returns {Promise<Object>}
 */
export const create = async (data) => {
  const sql = `
    INSERT INTO accounts (
      application_id,
      external_id,
      identity_id,
      account_name,
      email,
      status,
      source,
      last_login_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    RETURNING 
      id,
      application_id,
      identity_id,
      external_id,
      account_name,
      email,
      status,
      source,
      last_login_at,
      created_at,
      updated_at;
  `;

  const values = [
    data.application_id,
    data.external_id,
    data.identity_id !== undefined ? data.identity_id : null,
    data.account_name !== undefined ? data.account_name : null,
    data.email !== undefined ? data.email : null,
    data.status || 'active',
    data.source || 'direct',
    data.last_login_at !== undefined ? data.last_login_at : null
  ];

  const result = await query(sql, values);
  return result.rows[0];
};

/**
 * Partially update permitted fields on an existing account
 *
 * @param {string} id - UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object|null>}
 */
export const update = async (id, data) => {
  const setClauses = [];
  const values = [];

  const updateableFields = [
    'external_id',
    'identity_id',
    'account_name',
    'email',
    'status',
    'source',
    'last_login_at'
  ];

  for (const field of updateableFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      values.push(data[field]);
      setClauses.push(`${field} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  // Explicitly touch updated_at timestamp
  setClauses.push('updated_at = NOW()');

  values.push(id);
  const idIdx = values.length;

  const sql = `
    UPDATE accounts
    SET ${setClauses.join(', ')}
    WHERE id = $${idIdx}
    RETURNING 
      id,
      application_id,
      identity_id,
      external_id,
      account_name,
      email,
      status,
      source,
      last_login_at,
      created_at,
      updated_at;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};

/**
 * Check if an application exists by UUID
 *
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
export const applicationExists = async (id) => {
  const sql = 'SELECT 1 FROM applications WHERE id = $1 LIMIT 1;';
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
};

/**
 * Check if an identity exists by UUID
 *
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
export const identityExists = async (id) => {
  const sql = 'SELECT 1 FROM identities WHERE id = $1 LIMIT 1;';
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
};
