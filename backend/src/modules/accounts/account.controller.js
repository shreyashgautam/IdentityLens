import * as accountService from './account.service.js';
import { successResponse } from '../../helpers/response.helper.js';

/**
 * Account Controller
 * Handles HTTP requests, unpacks validated input, and formats standard responses.
 * Conforms to docs/architecture.md Section 7.10 & docs/api-contract.md Section 14.3
 */

/**
 * GET /api/v1/accounts
 * List accounts with pagination, filters, search, and sorting
 */
export const list = async (req, res, next) => {
  try {
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await accountService.listAccounts(queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/accounts/:accountId
 * Retrieve a single account by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { accountId } = req.validatedParams || req.params;
    const account = await accountService.getAccountById(accountId);

    return successResponse(res, account, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/accounts
 * Create a new target account
 */
export const create = async (req, res, next) => {
  try {
    const accountData = req.validatedBody || req.body;
    const created = await accountService.createAccount(accountData);

    return successResponse(res, created, {
      status: 201
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/accounts/:accountId
 * Partially update an account
 */
export const update = async (req, res, next) => {
  try {
    // Contract requirement: Reject empty update bodies with 400 Bad Request
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      const emptyError = new Error('Request body cannot be empty');
      emptyError.status = 400;
      emptyError.code = 'BAD_REQUEST';
      return next(emptyError);
    }

    const { accountId } = req.validatedParams || req.params;
    const updateFields = req.validatedBody || req.body;
    const updated = await accountService.updateAccount(accountId, updateFields);

    return successResponse(res, updated, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/identities/:identityId/accounts
 * List accounts belonging to a canonical identity
 */
export const getAccountsByIdentity = async (req, res, next) => {
  try {
    const { identityId } = req.validatedParams || req.params;
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await accountService.listAccountsByIdentity(identityId, queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/applications/:applicationId/accounts
 * List accounts provisioned within a target application
 */
export const getAccountsByApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.validatedParams || req.params;
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await accountService.listAccountsByApplication(applicationId, queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};
