import { query } from '../../database/connection.js';
import { ALLOWED_ENTITLEMENT_SORT_FIELDS } from './entitlement.validation.js';

/**
 * Entitlement Repository
 * Owns parameterized SQL for entitlements definitions and account_entitlements join table.
 * Conforms to docs/architecture.md Section 7.12 & docs/data-model.md Section 3.4 & 3.5
 */

/**
 * Find entitlements with pagination, filtering, search, and sorting
 *
 * @param {Object} options
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

  if (filters.application_id) {
    params.push(filters.application_id);
    whereClauses.push(`application_id = $${params.length}`);
  }

  if (filters.type) {
    params.push(filters.type);
    whereClauses.push(`type = $${params.length}`);
  }

  if (typeof filters.is_privileged === 'boolean') {
    params.push(filters.is_privileged);
    whereClauses.push(`is_privileged = $${params.length}`);
  }

  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const searchIdx = params.length;
    whereClauses.push(`(
      name ILIKE $${searchIdx} OR
      external_id ILIKE $${searchIdx} OR
      description ILIKE $${searchIdx}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS total FROM entitlements ${whereSql};`;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  const safeSortBy = ALLOWED_ENTITLEMENT_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const queryParams = [...params];
  queryParams.push(limit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataSql = `
    SELECT 
      id,
      application_id,
      name,
      external_id,
      description,
      type,
      is_privileged,
      created_at,
      updated_at
    FROM entitlements
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
 * Find a single entitlement definition by primary key ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const sql = `
    SELECT 
      id,
      application_id,
      name,
      external_id,
      description,
      type,
      is_privileged,
      created_at,
      updated_at
    FROM entitlements
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Find an entitlement by application_id and name
 *
 * @param {string} applicationId - UUID
 * @param {string} name - String
 * @returns {Promise<Object|null>}
 */
export const findByAppAndName = async (applicationId, name) => {
  const sql = `
    SELECT id, application_id, name
    FROM entitlements
    WHERE application_id = $1 AND name = $2;
  `;
  const result = await query(sql, [applicationId, name]);
  return result.rows[0] || null;
};

/**
 * Insert a new entitlement definition into PostgreSQL
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const create = async (data) => {
  const sql = `
    INSERT INTO entitlements (
      application_id,
      name,
      external_id,
      description,
      type,
      is_privileged
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    )
    RETURNING 
      id,
      application_id,
      name,
      external_id,
      description,
      type,
      is_privileged,
      created_at,
      updated_at;
  `;

  const values = [
    data.application_id,
    data.name,
    data.external_id !== undefined ? data.external_id : null,
    data.description !== undefined ? data.description : null,
    data.type || 'role',
    data.is_privileged !== undefined ? data.is_privileged : false
  ];

  const result = await query(sql, values);
  return result.rows[0];
};

/**
 * Partially update permitted fields on an existing entitlement definition
 *
 * @param {string} id - UUID
 * @param {Object} data
 * @returns {Promise<Object|null>}
 */
export const update = async (id, data) => {
  const setClauses = [];
  const values = [];

  const updateableFields = ['name', 'external_id', 'description', 'type', 'is_privileged'];

  for (const field of updateableFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      values.push(data[field]);
      setClauses.push(`${field} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push('updated_at = NOW()');

  values.push(id);
  const idIdx = values.length;

  const sql = `
    UPDATE entitlements
    SET ${setClauses.join(', ')}
    WHERE id = $${idIdx}
    RETURNING 
      id,
      application_id,
      name,
      external_id,
      description,
      type,
      is_privileged,
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
 * Check if an account exists by UUID
 *
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
export const accountExists = async (id) => {
  const sql = 'SELECT 1 FROM accounts WHERE id = $1 LIMIT 1;';
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
};

/**
 * Find entitlements assigned to a specific account
 *
 * @param {Object} options
 * @param {string} options.accountId - UUID
 * @param {Object} options.filters
 * @param {string} options.sortBy
 * @param {string} options.sortOrder
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Promise<{ rows: Array, total: number }>}
 */
export const findAccountEntitlements = async ({
  accountId,
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc',
  limit = 20,
  offset = 0
}) => {
  const whereClauses = ['ae.account_id = $1'];
  const params = [accountId];

  if (filters.type) {
    params.push(filters.type);
    whereClauses.push(`e.type = $${params.length}`);
  }

  if (typeof filters.is_privileged === 'boolean') {
    params.push(filters.is_privileged);
    whereClauses.push(`e.is_privileged = $${params.length}`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countSql = `
    SELECT COUNT(*)::int AS total 
    FROM account_entitlements ae
    JOIN entitlements e ON ae.entitlement_id = e.id
    ${whereSql};
  `;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  const safeSortBy = ALLOWED_ENTITLEMENT_SORT_FIELDS.includes(sortBy) ? `e.${sortBy}` : 'ae.assigned_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const queryParams = [...params];
  queryParams.push(limit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataSql = `
    SELECT 
      e.id,
      e.application_id,
      e.name,
      e.external_id,
      e.description,
      e.type,
      e.is_privileged,
      ae.assigned_at,
      e.created_at,
      e.updated_at
    FROM account_entitlements ae
    JOIN entitlements e ON ae.entitlement_id = e.id
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}, e.id ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const dataResult = await query(dataSql, queryParams);

  return {
    rows: dataResult.rows,
    total
  };
};

/**
 * Find an account-entitlement assignment
 *
 * @param {string} accountId - UUID
 * @param {string} entitlementId - UUID
 * @returns {Promise<Object|null>}
 */
export const findAssignment = async (accountId, entitlementId) => {
  const sql = `
    SELECT account_id, entitlement_id, assigned_at, created_at
    FROM account_entitlements
    WHERE account_id = $1 AND entitlement_id = $2;
  `;
  const result = await query(sql, [accountId, entitlementId]);
  return result.rows[0] || null;
};

/**
 * Delete an account-entitlement assignment
 *
 * @param {string} accountId - UUID
 * @param {string} entitlementId - UUID
 * @returns {Promise<boolean>} - True if row was deleted, false if not found
 */
export const deleteAssignment = async (accountId, entitlementId) => {
  const sql = `
    DELETE FROM account_entitlements
    WHERE account_id = $1 AND entitlement_id = $2
    RETURNING account_id, entitlement_id;
  `;
  const result = await query(sql, [accountId, entitlementId]);
  return (result.rowCount ?? 0) > 0;
};
