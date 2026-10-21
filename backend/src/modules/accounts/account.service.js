import * as accountRepo from './account.repository.js';

/**
 * Account Service
 * Implements business rules, pagination calculations, foreign key integrity, and conflict handling.
 * Conforms to docs/architecture.md Section 7.11 & docs/data-model.md Section 3.3
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
 * List accounts with pagination, filtering, search, and sorting
 *
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listAccounts = async (queryOptions = {}) => {
  const {
    page = 1,
    limit = 20,
    application_id,
    identity_id,
    status,
    is_orphan,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = queryOptions;

  const offset = (page - 1) * limit;

  const filters = {};
  if (application_id) filters.application_id = application_id;
  if (identity_id) filters.identity_id = identity_id;
  if (status) filters.status = status;
  if (typeof is_orphan === 'boolean') filters.is_orphan = is_orphan;

  const { rows, total } = await accountRepo.findAndCount({
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
 * Retrieve a single account by primary key ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object>}
 */
export const getAccountById = async (id) => {
  const account = await accountRepo.findById(id);

  if (!account) {
    throw createNotFoundError('ACCOUNT_NOT_FOUND', `Account with ID '${id}' not found`);
  }

  return account;
};

/**
 * Create a new account with foreign key validation and uniqueness checks
 *
 * @param {Object} accountData
 * @returns {Promise<Object>}
 */
export const createAccount = async (accountData) => {
  // 1. Verify target application exists
  const appExists = await accountRepo.applicationExists(accountData.application_id);
  if (!appExists) {
    throw createValidationError(
      'application_id',
      `Application with ID '${accountData.application_id}' does not exist`
    );
  }

  // 2. Verify target identity exists if supplied
  if (accountData.identity_id) {
    const idExists = await accountRepo.identityExists(accountData.identity_id);
    if (!idExists) {
      throw createValidationError(
        'identity_id',
        `Identity with ID '${accountData.identity_id}' does not exist`
      );
    }
  }

  // 3. Pre-check composite uniqueness (application_id, external_id)
  const existing = await accountRepo.findByAppAndExternalId(
    accountData.application_id,
    accountData.external_id
  );
  if (existing) {
    throw createConflictError(
      `Account with external_id '${accountData.external_id}' already exists in this application`
    );
  }

  // 4. Insert into database with safety wrapper for concurrent race conditions
  try {
    return await accountRepo.create(accountData);
  } catch (err) {
    if (err.code === '23505') {
      throw createConflictError(
        `Account with external_id '${accountData.external_id}' already exists in this application`
      );
    }
    if (err.code === '23503') {
      throw createValidationError('foreign_key', 'Referenced resource does not exist');
    }
    throw err;
  }
};

/**
 * Partially update permitted fields on an existing account
 *
 * @param {string} id - UUID
 * @param {Object} updateFields - Key-value pairs to update
 * @returns {Promise<Object>}
 */
export const updateAccount = async (id, updateFields) => {
  // 1. Verify account exists
  const existing = await accountRepo.findById(id);
  if (!existing) {
    throw createNotFoundError('ACCOUNT_NOT_FOUND', `Account with ID '${id}' not found`);
  }

  // 2. Verify identity exists if identity_id is being updated to a non-null UUID
  if (updateFields.identity_id) {
    const idExists = await accountRepo.identityExists(updateFields.identity_id);
    if (!idExists) {
      throw createValidationError(
        'identity_id',
        `Identity with ID '${updateFields.identity_id}' does not exist`
      );
    }
  }

  // 3. If external_id is changing, check composite uniqueness
  if (updateFields.external_id && updateFields.external_id !== existing.external_id) {
    const conflict = await accountRepo.findByAppAndExternalId(
      existing.application_id,
      updateFields.external_id
    );
    if (conflict && conflict.id !== id) {
      throw createConflictError(
        `Account with external_id '${updateFields.external_id}' already exists in this application`
      );
    }
  }

  // 4. Apply update with race-condition handling
  try {
    return await accountRepo.update(id, updateFields);
  } catch (err) {
    if (err.code === '23505') {
      throw createConflictError(
        `Account with external_id '${updateFields.external_id}' already exists in this application`
      );
    }
    if (err.code === '23503') {
      throw createValidationError('foreign_key', 'Referenced resource does not exist');
    }
    throw err;
  }
};

/**
 * List accounts belonging to a specific identity
 * Enforces parent identity existence check (returns 404 if parent does not exist)
 *
 * @param {string} identityId - UUID
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listAccountsByIdentity = async (identityId, queryOptions = {}) => {
  const exists = await accountRepo.identityExists(identityId);
  if (!exists) {
    throw createNotFoundError('IDENTITY_NOT_FOUND', `Identity with ID '${identityId}' not found`);
  }

  return listAccounts({
    ...queryOptions,
    identity_id: identityId
  });
};

/**
 * List accounts provisioned within a specific application
 * Enforces parent application existence check (returns 404 if parent does not exist)
 *
 * @param {string} applicationId - UUID
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listAccountsByApplication = async (applicationId, queryOptions = {}) => {
  const exists = await accountRepo.applicationExists(applicationId);
  if (!exists) {
    throw createNotFoundError('APPLICATION_NOT_FOUND', `Application with ID '${applicationId}' not found`);
  }

  return listAccounts({
    ...queryOptions,
    application_id: applicationId
  });
};
