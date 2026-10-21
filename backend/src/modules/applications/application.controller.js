import * as applicationService from './application.service.js';
import { successResponse } from '../../helpers/response.helper.js';

/**
 * Application Controller
 * Handles HTTP requests, unpacks validated input, and formats standard responses.
 * Conforms to docs/architecture.md Section 7.10 & docs/api-contract.md Section 14.2
 */

/**
 * GET /api/v1/applications
 * List applications with pagination, filters, search, and sorting
 */
export const list = async (req, res, next) => {
  try {
    const queryOptions = req.validatedQuery || req.query;
    const { data, pagination } = await applicationService.listApplications(queryOptions);

    return successResponse(res, data, {
      status: 200,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/applications/:applicationId
 * Retrieve a single application by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { applicationId } = req.validatedParams || req.params;
    const application = await applicationService.getApplicationById(applicationId);

    return successResponse(res, application, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/applications
 * Create a new target application
 */
export const create = async (req, res, next) => {
  try {
    const applicationData = req.validatedBody || req.body;
    const created = await applicationService.createApplication(applicationData);

    return successResponse(res, created, {
      status: 201
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/applications/:applicationId
 * Partially update an application
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

    const { applicationId } = req.validatedParams || req.params;
    const updateFields = req.validatedBody || req.body;
    const updated = await applicationService.updateApplication(applicationId, updateFields);

    return successResponse(res, updated, {
      status: 200
    });
  } catch (error) {
    next(error);
  }
};
