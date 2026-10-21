import { query } from '../../database/connection.js';
import { ALLOWED_APPLICATION_SORT_FIELDS } from './application.validation.js';

/**
 * Application Repository
 * Owns all database interactions and parameterized SQL for the applications table.
 * Conforms to docs/architecture.md Section 7.12 & docs/data-model.md Section 3.2
 */

/**
 * Find applications with pagination, filtering, search, and sorting
 *
 * @param {Object} options
 * @param {Object} options.filters - Optional exact filters (status, auth_type)
 * @param {string} options.search - Optional search string
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
  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`status = $${params.length}`);
  }

  if (filters.auth_type) {
    params.push(filters.auth_type);
    whereClauses.push(`auth_type = $${params.length}`);
  }

  // 2. Search filter across name, key, and description
  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const searchIdx = params.length;
    whereClauses.push(`(
      name ILIKE $${searchIdx} OR
      key ILIKE $${searchIdx} OR
      description ILIKE $${searchIdx}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 3. Count total matching rows
  const countSql = `SELECT COUNT(*)::int AS total FROM applications ${whereSql};`;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  // 4. Validate sort column against allowlist (defense-in-depth against SQL injection)
  const safeSortBy = ALLOWED_APPLICATION_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // 5. Query matching rows with pagination and stable secondary sort
  const queryParams = [...params];
  queryParams.push(limit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const dataSql = `
    SELECT 
      id,
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at
    FROM applications
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
 * Find a single application by primary key ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const sql = `
    SELECT 
      id,
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at
    FROM applications
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Find an application by its unique key
 *
 * @param {string} key - Application key
 * @returns {Promise<Object|null>}
 */
export const findByKey = async (key) => {
  const sql = `
    SELECT 
      id,
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at
    FROM applications
    WHERE key = $1;
  `;
  const result = await query(sql, [key]);
  return result.rows[0] || null;
};

/**
 * Check if an application exists by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
export const existsById = async (id) => {
  const sql = `SELECT 1 FROM applications WHERE id = $1 LIMIT 1;`;
  const result = await query(sql, [id]);
  return result.rowCount > 0;
};

/**
 * Check if a key is already in use by another application
 *
 * @param {string} key - Application key
 * @param {string|null} excludeId - Optional application ID to exclude (during update)
 * @returns {Promise<boolean>}
 */
export const existsByKey = async (key, excludeId = null) => {
  if (excludeId) {
    const sql = `SELECT 1 FROM applications WHERE key = $1 AND id <> $2 LIMIT 1;`;
    const result = await query(sql, [key, excludeId]);
    return result.rowCount > 0;
  }

  const sql = `SELECT 1 FROM applications WHERE key = $1 LIMIT 1;`;
  const result = await query(sql, [key]);
  return result.rowCount > 0;
};

/**
 * Create a new application record
 *
 * @param {Object} applicationData
 * @returns {Promise<Object>}
 */
export const create = async (applicationData) => {
  const {
    name,
    key,
    description = null,
    status = 'active',
    auth_type = 'password'
  } = applicationData;

  const sql = `
    INSERT INTO applications (
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING 
      id,
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at;
  `;

  const values = [name, key, description, status, auth_type];
  const result = await query(sql, values);
  return result.rows[0];
};

/**
 * Partially update an existing application record
 *
 * @param {string} id - UUID
 * @param {Object} updateFields - Key-value pairs to update
 * @returns {Promise<Object|null>}
 */
export const update = async (id, updateFields) => {
  const allowedColumns = ['name', 'key', 'description', 'status', 'auth_type'];
  const setClauses = [];
  const values = [];

  for (const [col, val] of Object.entries(updateFields)) {
    if (allowedColumns.includes(col)) {
      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
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
    UPDATE applications
    SET ${setClauses.join(', ')}
    WHERE id = $${idIdx}
    RETURNING 
      id,
      name,
      key,
      description,
      status,
      auth_type,
      created_at,
      updated_at;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};
