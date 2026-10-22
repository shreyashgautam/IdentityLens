import * as entitlementService from './entitlement.service.js';
import { successResponse } from '../../helpers/response.helper.js';

/**
 * Entitlement Controller
 * Handles HTTP requests, unpacks validated input, and formats standard responses.
 * Conforms to docs/architecture.md Section 7.10 & docs/api-contract.md Section 14.3 & 14.4
 */

/**
 * GET /api/v1/entitlements
 * List entitlements with pagination, filters, search, and sorting
 */
export const list = async (req, res, next) => {
  try {
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await entitlementService.listEntitlements(queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/entitlements/:entitlementId
 * Retrieve a single entitlement definition by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { entitlementId } = req.validatedParams || req.params;
    const entitlement = await entitlementService.getEntitlementById(entitlementId);

    return successResponse(res, entitlement, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/entitlements
 * Create a new entitlement definition
 */
export const create = async (req, res, next) => {
  try {
    const entitlementData = req.validatedBody || req.body;
    const created = await entitlementService.createEntitlement(entitlementData);

    return successResponse(res, created, {
      status: 201
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/entitlements/:entitlementId
 * Partially update an entitlement definition
 */
export const update = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      const emptyError = new Error('Request body cannot be empty');
      emptyError.status = 400;
      emptyError.code = 'BAD_REQUEST';
      return next(emptyError);
    }

    const { entitlementId } = req.validatedParams || req.params;
    const updateFields = req.validatedBody || req.body;
    const updated = await entitlementService.updateEntitlement(entitlementId, updateFields);

    return successResponse(res, updated, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/accounts/:accountId/entitlements
 * List entitlements assigned to an account
 */
export const listForAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validatedParams || req.params;
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await entitlementService.listAccountEntitlements(accountId, queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/accounts/:accountId/entitlements
 * Assign an entitlement to an account
 */
export const assignToAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validatedParams || req.params;
    const { entitlement_id } = req.validatedBody || req.body;
    const assignment = await entitlementService.assignEntitlementToAccount(accountId, entitlement_id);

    return successResponse(res, assignment, {
      status: 201
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId
 * Remove an entitlement assignment from an account
 */
export const removeFromAccount = async (req, res, next) => {
  try {
    const { accountId, entitlementId } = req.validatedParams || req.params;
    await entitlementService.removeEntitlementFromAccount(accountId, entitlementId);

    // Return 204 No Content upon successful removal
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
