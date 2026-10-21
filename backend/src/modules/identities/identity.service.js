import * as identityRepo from './identity.repository.js';

/**
 * Identity Service
 * Implements business rules, validation logic, ownership cycle guards, and coordination.
 * Conforms to docs/architecture.md Section 7.11 & docs/data-model.md Section 3.1
 */

/**
 * List identities with pagination, filtering, search, and sorting
 *
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listIdentities = async (queryOptions) => {
  const {
    page = 1,
    limit = 20,
    status,
    identity_type,
    department,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = queryOptions;

  const offset = (page - 1) * limit;

  const filters = {};
  if (status) filters.status = status;
  if (identity_type) filters.identity_type = identity_type;
  if (department) filters.department = department;

  const { rows, total } = await identityRepo.findAndCount({
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
 * Retrieve a single identity by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object>}
 */
export const getIdentityById = async (id) => {
  const identity = await identityRepo.findById(id);

  if (!identity) {
    const error = new Error(`Identity with ID '${id}' not found`);
    error.status = 404;
    error.code = 'IDENTITY_NOT_FOUND';
    throw error;
  }

  return identity;
};

/**
 * Create a new identity with ownership validation
 *
 * @param {Object} identityData
 * @returns {Promise<Object>}
 */
export const createIdentity = async (identityData) => {
  // If owner_id is specified, verify that the referenced owner identity exists
  if (identityData.owner_id) {
    const ownerExists = await identityRepo.existsById(identityData.owner_id);
    if (!ownerExists) {
      const error = new Error('The request contains invalid fields.');
      error.status = 422;
      error.code = 'VALIDATION_ERROR';
      error.details = [
        {
          field: 'owner_id',
          message: 'Referenced owner identity does not exist'
        }
      ];
      throw error;
    }
  }

  return identityRepo.create(identityData);
};

/**
 * Partially update an identity with ownership integrity and cycle prevention
 *
 * @param {string} id - UUID of identity to update
 * @param {Object} updateFields - Key-value pairs to update
 * @returns {Promise<Object>}
 */
export const updateIdentity = async (id, updateFields) => {
  // 1. Verify that the target identity exists
  const existingIdentity = await identityRepo.findById(id);
  if (!existingIdentity) {
    const error = new Error(`Identity with ID '${id}' not found`);
    error.status = 404;
    error.code = 'IDENTITY_NOT_FOUND';
    throw error;
  }

  // 2. Ownership hierarchy validations if owner_id is being updated
  if (updateFields.owner_id !== undefined) {
    const candidateOwnerId = updateFields.owner_id;

    if (candidateOwnerId !== null) {
      // 2a. Reject direct self-ownership
      if (candidateOwnerId === id) {
        const error = new Error('The request contains invalid fields.');
        error.status = 422;
        error.code = 'VALIDATION_ERROR';
        error.details = [
          {
            field: 'owner_id',
            message: 'An identity cannot be its own owner'
          }
        ];
        throw error;
      }

      // 2b. Verify that candidate owner exists
      const ownerExists = await identityRepo.existsById(candidateOwnerId);
      if (!ownerExists) {
        const error = new Error('The request contains invalid fields.');
        error.status = 422;
        error.code = 'VALIDATION_ERROR';
        error.details = [
          {
            field: 'owner_id',
            message: 'Referenced owner identity does not exist'
          }
        ];
        throw error;
      }

      // 2c. Check for multi-hop ownership cycles (candidateOwnerId -> ... -> id)
      const hasCycle = await identityRepo.isAncestralOwner(candidateOwnerId, id);
      if (hasCycle) {
        const error = new Error('Ownership cycle detected: assigning this owner would create a circular dependency');
        error.status = 409;
        error.code = 'RESOURCE_CONFLICT';
        throw error;
      }
    }
  }

  return identityRepo.update(id, updateFields);
};
