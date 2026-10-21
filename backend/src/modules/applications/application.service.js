import * as applicationRepo from './application.repository.js';

/**
 * Application Service
 * Implements business rules, pagination calculations, and unique key conflict handling.
 * Conforms to docs/architecture.md Section 7.11 & docs/data-model.md Section 3.2
 */

/**
 * List applications with pagination, filtering, search, and sorting
 *
 * @param {Object} queryOptions
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const listApplications = async (queryOptions) => {
  const {
    page = 1,
    limit = 20,
    status,
    auth_type,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = queryOptions;

  const offset = (page - 1) * limit;

  const filters = {};
  if (status) filters.status = status;
  if (auth_type) filters.auth_type = auth_type;

  const { rows, total } = await applicationRepo.findAndCount({
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
 * Retrieve a single application by ID
 *
 * @param {string} id - UUID
 * @returns {Promise<Object>}
 */
export const getApplicationById = async (id) => {
  const application = await applicationRepo.findById(id);

  if (!application) {
    const error = new Error(`Application with ID '${id}' not found`);
    error.status = 404;
    error.code = 'APPLICATION_NOT_FOUND';
    throw error;
  }

  return application;
};

/**
 * Create a new application with uniqueness validation on key
 *
 * @param {Object} applicationData
 * @returns {Promise<Object>}
 */
export const createApplication = async (applicationData) => {
  // Check for uniqueness of application key
  const keyExists = await applicationRepo.existsByKey(applicationData.key);
  if (keyExists) {
    const error = new Error(`Application with key '${applicationData.key}' already exists`);
    error.status = 409;
    error.code = 'RESOURCE_CONFLICT';
    throw error;
  }

  return applicationRepo.create(applicationData);
};

/**
 * Partially update an application with uniqueness checks
 *
 * @param {string} id - UUID of application to update
 * @param {Object} updateFields - Key-value pairs to update
 * @returns {Promise<Object>}
 */
export const updateApplication = async (id, updateFields) => {
  // 1. Verify target application exists
  const existingApp = await applicationRepo.findById(id);
  if (!existingApp) {
    const error = new Error(`Application with ID '${id}' not found`);
    error.status = 404;
    error.code = 'APPLICATION_NOT_FOUND';
    throw error;
  }

  // 2. If key is being updated, verify it is not in use by another application
  if (updateFields.key && updateFields.key !== existingApp.key) {
    const keyInUse = await applicationRepo.existsByKey(updateFields.key, id);
    if (keyInUse) {
      const error = new Error(`Application with key '${updateFields.key}' already exists`);
      error.status = 409;
      error.code = 'RESOURCE_CONFLICT';
      throw error;
    }
  }

  return applicationRepo.update(id, updateFields);
};
