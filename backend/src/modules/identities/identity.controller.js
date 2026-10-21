import * as identityService from './identity.service.js';
import { successResponse } from '../../helpers/response.helper.js';

/**
 * Identity Controller
 * Handles HTTP requests, unpacks validated input, and formats responses.
 * Conforms to docs/architecture.md Section 7.10 & docs/api-contract.md Section 14.1
 */

/**
 * GET /api/v1/identities
 * List identities with pagination, filters, and sorting
 */
export const list = async (req, res, next) => {
  try {
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await identityService.listIdentities(queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/identities/:identityId
 * Retrieve a single identity by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { identityId } = req.validatedParams || req.params;
    const identity = await identityService.getIdentityById(identityId);

    return successResponse(res, identity, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/identities
 * Create a new canonical identity
 */
export const create = async (req, res, next) => {
  try {
    const identityData = req.validatedBody || req.body;
    const created = await identityService.createIdentity(identityData);

    return successResponse(res, created, {
      status: 201
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/identities/:identityId
 * Partially update an identity
 */
export const update = async (req, res, next) => {
  try {
    // Contract check: Reject empty update bodies with 400 Bad Request
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      const emptyError = new Error('Request body cannot be empty');
      emptyError.status = 400;
      emptyError.code = 'BAD_REQUEST';
      return next(emptyError);
    }

    const { identityId } = req.validatedParams || req.params;
    const updateFields = req.validatedBody || req.body;
    const updated = await identityService.updateIdentity(identityId, updateFields);

    return successResponse(res, updated, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};
