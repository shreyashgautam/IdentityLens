import * as entitlementRepo from './entitlement.repository.js';
import { pool } from '../../database/connection.js';

/**
 * Entitlement Service
 * Implements business rules, cross-application consistency validation, transactional assignments,
 * and duplicate conflict handling.
 * Conforms to docs/architecture.md Section 7.11 & docs/data-model.md Section 3.4 & 3.5
 */

/**
 * Helper to construct standard validation error
 */
const createValidationError = (field, message) => {
  const error = new Error('The request contains invalid fields.');
  error.status = 422;
  error.code = 'VALIDATION_ERROR';
  error.details = [{ field, message }];
  return error;
};

/**
 * Helper to construct standard conflict error
 */
const createConflictError = (message) => {
  const error = new Error(message);
  error.status = 409;
  error.code = 'RESOURCE_CONFLICT';
  return error;
};

/**
 * Helper to construct standard not found error
 */
const createNotFoundError = (code, message) => {
  const error = new Error(message);
  error.status = 404;
  error.code = code;
  return error;
};

/**
 * List entitlements with pagination, filtering, search, and sorting
 *
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listEntitlements = async (queryOptions = {}) => {
  const {
    page = 1,
    limit = 20,
    application_id,
    type,
    is_privileged,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = queryOptions;

  const offset = (page - 1) * limit;

  const filters = {};
  if (application_id) filters.application_id = application_id;
  if (type) filters.type = type;
  if (typeof is_privileged === 'boolean') filters.is_privileged = is_privileged;

  const { rows, total } = await entitlementRepo.findAndCount({
    filters,
    search,
    sortBy: sort_by,
    sortOrder: sort_order,
    limit,
    offset
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page * limit < total,
      has_prev: page > 1
    }
  };
};

/**
 * Retrieve a single entitlement definition by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object>}
 */
export const getEntitlementById = async (id) => {
  const entitlement = await entitlementRepo.findById(id);

  if (!entitlement) {
    throw createNotFoundError('ENTITLEMENT_NOT_FOUND', `Entitlement with ID '${id}' not found`);
  }

  return entitlement;
};

/**
 * Create a new entitlement definition with unique (application_id, name) validation
 *
 * @param {Object} entitlementData
 * @returns {Promise<Object>}
 */
export const createEntitlement = async (entitlementData) => {
  // 1. Verify target application exists
  const appExists = await entitlementRepo.applicationExists(entitlementData.application_id);
  if (!appExists) {
    throw createValidationError(
      'application_id',
      `Application with ID '${entitlementData.application_id}' does not exist`
    );
  }

  // 2. Pre-check unique constraint (application_id, name)
  const existing = await entitlementRepo.findByAppAndName(
    entitlementData.application_id,
    entitlementData.name
  );
  if (existing) {
    throw createConflictError(
      `Entitlement with name '${entitlementData.name}' already exists in this application`
    );
  }

  // 3. Insert with safety handling for concurrent writes
  try {
    return await entitlementRepo.create(entitlementData);
  } catch (err) {
    if (err.code === '23505') {
      throw createConflictError(
        `Entitlement with name '${entitlementData.name}' already exists in this application`
      );
    }
    if (err.code === '23503') {
      throw createValidationError('application_id', 'Referenced application does not exist');
    }
    throw err;
  }
};

/**
 * Partially update permitted fields on an existing entitlement definition
 *
 * @param {string} id - UUID
 * @param {Object} updateFields
 * @returns {Promise<Object>}
 */
export const updateEntitlement = async (id, updateFields) => {
  const existing = await entitlementRepo.findById(id);
  if (!existing) {
    throw createNotFoundError('ENTITLEMENT_NOT_FOUND', `Entitlement with ID '${id}' not found`);
  }

  if (updateFields.name && updateFields.name !== existing.name) {
    const conflict = await entitlementRepo.findByAppAndName(
      existing.application_id,
      updateFields.name
    );
    if (conflict && conflict.id !== id) {
      throw createConflictError(
        `Entitlement with name '${updateFields.name}' already exists in this application`
      );
    }
  }

  try {
    return await entitlementRepo.update(id, updateFields);
  } catch (err) {
    if (err.code === '23505') {
      throw createConflictError(
        `Entitlement with name '${updateFields.name}' already exists in this application`
      );
    }
    throw err;
  }
};

/**
 * List entitlements assigned to a specific account
 *
 * @param {string} accountId - UUID
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listAccountEntitlements = async (accountId, queryOptions = {}) => {
  const exists = await entitlementRepo.accountExists(accountId);
  if (!exists) {
    throw createNotFoundError('ACCOUNT_NOT_FOUND', `Account with ID '${accountId}' not found`);
  }

  const {
    page = 1,
    limit = 20,
    type,
    is_privileged,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = queryOptions;

  const offset = (page - 1) * limit;

  const filters = {};
  if (type) filters.type = type;
  if (typeof is_privileged === 'boolean') filters.is_privileged = is_privileged;

  const { rows, total } = await entitlementRepo.findAccountEntitlements({
    accountId,
    filters,
    sortBy: sort_by,
    sortOrder: sort_order,
    limit,
    offset
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page * limit < total,
      has_prev: page > 1
    }
  };
};

/**
 * Assign an entitlement to an account within an explicit database transaction
 * Enforces cross-application consistency and row locking against concurrent changes
 *
 * @param {string} accountId - UUID
 * @param {string} entitlementId - UUID
 * @returns {Promise<Object>}
 */
export const assignEntitlementToAccount = async (accountId, entitlementId) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // 1. Fetch account with row-level share lock to guard against concurrent mutations
    const accountRes = await client.query(
      'SELECT id, application_id FROM accounts WHERE id = $1 FOR SHARE;',
      [accountId]
    );
    if (accountRes.rowCount === 0) {
      throw createNotFoundError('ACCOUNT_NOT_FOUND', `Account with ID '${accountId}' not found`);
    }
    const account = accountRes.rows[0];

    // 2. Fetch entitlement with row-level share lock
    const entRes = await client.query(
      'SELECT id, application_id FROM entitlements WHERE id = $1 FOR SHARE;',
      [entitlementId]
    );
    if (entRes.rowCount === 0) {
      throw createValidationError(
        'entitlement_id',
        `Entitlement with ID '${entitlementId}' does not exist`
      );
    }
    const entitlement = entRes.rows[0];

    // 3. Application-Consistency Check (docs/data-model.md Section 3.5)
    if (account.application_id !== entitlement.application_id) {
      throw createValidationError(
        'entitlement_id',
        'Cross-application entitlement assignment is forbidden: account and entitlement belong to different applications'
      );
    }

    // 4. Insert assignment into join table
    const insertRes = await client.query(
      `INSERT INTO account_entitlements (account_id, entitlement_id, assigned_at)
       VALUES ($1, $2, NOW())
       RETURNING account_id, entitlement_id, assigned_at, created_at;`,
      [accountId, entitlementId]
    );

    await client.query('COMMIT');
    inTransaction = false;

    return insertRes.rows[0];
  } catch (originalError) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[Transaction Rollback Error] Rollback failed:', rollbackErr);
        // Do NOT allow rollback error to mask the original error
      }
    }

    // Map PostgreSQL unique violation (23505) on PRIMARY KEY (account_id, entitlement_id) to 409 Conflict
    if (originalError.code === '23505') {
      throw createConflictError('Entitlement is already assigned to this account');
    }

    // Map PostgreSQL foreign key violation (23503)
    if (originalError.code === '23503') {
      throw createValidationError('entitlement_id', 'Referenced resource does not exist');
    }

    throw originalError;
  } finally {
    client.release();
  }
};

/**
 * Remove an entitlement assignment from an account
 *
 * @param {string} accountId - UUID
 * @param {string} entitlementId - UUID
 * @returns {Promise<void>}
 */
export const removeEntitlementFromAccount = async (accountId, entitlementId) => {
  // 1. Verify account exists
  const accExists = await entitlementRepo.accountExists(accountId);
  if (!accExists) {
    throw createNotFoundError('ACCOUNT_NOT_FOUND', `Account with ID '${accountId}' not found`);
  }

  // 2. Verify entitlement exists
  const entExists = await entitlementRepo.findById(entitlementId);
  if (!entExists) {
    throw createNotFoundError('ENTITLEMENT_NOT_FOUND', `Entitlement with ID '${entitlementId}' not found`);
  }

  // 3. Attempt assignment removal
  const deleted = await entitlementRepo.deleteAssignment(accountId, entitlementId);
  if (!deleted) {
    throw createNotFoundError(
      'ASSIGNMENT_NOT_FOUND',
      `Entitlement '${entitlementId}' is not assigned to account '${accountId}'`
    );
  }
};
