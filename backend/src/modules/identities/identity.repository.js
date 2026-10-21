import { query } from '../../database/connection.js';
import { ALLOWED_SORT_FIELDS } from './identity.validation.js';

/**
 * Identity Repository
 * Owns all database interactions and parameterized SQL for the identities table.
 * Conforms to docs/architecture.md Section 7.12 & docs/data-model.md Section 3.1
 */

/**
 * Find identities with pagination, filtering, search, and sorting
 *
 * @param {Object} options
 * @param {Object} options.filters - Optional exact filters (status, identity_type, department)
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

  if (filters.identity_type) {
    params.push(filters.identity_type);
    whereClauses.push(`identity_type = $${params.length}`);
  }

  if (filters.department) {
    params.push(filters.department);
    whereClauses.push(`department = $${params.length}`);
  }

  // 2. Search filter across display_name, email, title, and department
  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const searchIdx = params.length;
    whereClauses.push(`(
      display_name ILIKE $${searchIdx} OR
      email ILIKE $${searchIdx} OR
      title ILIKE $${searchIdx} OR
      department ILIKE $${searchIdx}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 3. Count total matching rows
  const countSql = `SELECT COUNT(*)::int AS total FROM identities ${whereSql};`;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  // 4. Validate sort column against allowlist (defense-in-depth against SQL injection)
  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
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
      display_name,
      identity_type,
      email,
      status,
      owner_id,
      department,
      title,
      created_at,
      updated_at
    FROM identities
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
 * Find a single identity by primary key ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const sql = `
    SELECT 
      id,
      display_name,
      identity_type,
      email,
      status,
      owner_id,
      department,
      title,
      created_at,
      updated_at
    FROM identities
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Check if an identity exists by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
export const existsById = async (id) => {
  const sql = `SELECT 1 FROM identities WHERE id = $1 LIMIT 1;`;
  const result = await query(sql, [id]);
  return result.rowCount > 0;
};

/**
 * Create a new identity record
 *
 * @param {Object} identityData
 * @returns {Promise<Object>}
 */
export const create = async (identityData) => {
  const {
    display_name,
    identity_type,
    email = null,
    status = 'active',
    owner_id = null,
    department = null,
    title = null
  } = identityData;

  const sql = `
    INSERT INTO identities (
      display_name,
      identity_type,
      email,
      status,
      owner_id,
      department,
      title,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING 
      id,
      display_name,
      identity_type,
      email,
      status,
      owner_id,
      department,
      title,
      created_at,
      updated_at;
  `;

  const values = [
    display_name,
    identity_type,
    email,
    status,
    owner_id,
    department,
    title
  ];

  const result = await query(sql, values);
  return result.rows[0];
};

/**
 * Partially update an existing identity record
 *
 * @param {string} id - UUID
 * @param {Object} updateFields - Key-value pairs to update
 * @returns {Promise<Object|null>}
 */
export const update = async (id, updateFields) => {
  const allowedColumns = [
    'display_name',
    'identity_type',
    'email',
    'status',
    'owner_id',
    'department',
    'title'
  ];

  const setClauses = [];
  const values = [];

  for (const [key, val] of Object.entries(updateFields)) {
    if (allowedColumns.includes(key)) {
      values.push(val);
      setClauses.push(`${key} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  // Always touch updated_at timestamp explicitly
  setClauses.push('updated_at = NOW()');

  values.push(id);
  const idIdx = values.length;

  const sql = `
    UPDATE identities
    SET ${setClauses.join(', ')}
    WHERE id = $${idIdx}
    RETURNING 
      id,
      display_name,
      identity_type,
      email,
      status,
      owner_id,
      department,
      title,
      created_at,
      updated_at;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};

/**
 * Check if targetIdentityId exists in the ancestral ownership chain of candidateOwnerId
 * Used to prevent multi-hop ownership cycles (A -> B -> ... -> A)
 *
 * @param {string} candidateOwnerId - The prospective owner
 * @param {string} targetIdentityId - The identity being assigned
 * @returns {Promise<boolean>} True if targetIdentityId is found in the ancestry chain
 */
export const isAncestralOwner = async (candidateOwnerId, targetIdentityId) => {
  const sql = `
    WITH RECURSIVE owner_chain AS (
      SELECT id, owner_id, 1 AS depth
      FROM identities
      WHERE id = $1
      
      UNION ALL
      
      SELECT i.id, i.owner_id, oc.depth + 1
      FROM identities i
      JOIN owner_chain oc ON i.id = oc.owner_id
      WHERE oc.owner_id IS NOT NULL AND oc.depth < 25
    )
    SELECT 1 FROM owner_chain WHERE id = $2 LIMIT 1;
  `;

  const result = await query(sql, [candidateOwnerId, targetIdentityId]);
  return result.rowCount > 0;
};
