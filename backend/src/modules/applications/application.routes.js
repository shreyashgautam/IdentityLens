import { Router } from 'express';
import * as applicationController from './application.controller.js';
import * as accountController from '../accounts/account.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  applicationIdParamSchema,
  listApplicationsQuerySchema,
  createApplicationBodySchema,
  updateApplicationBodySchema
} from './application.validation.js';
import { listAccountsQuerySchema } from '../accounts/account.validation.js';

const router = Router();

/**
 * Middleware ensuring PATCH requests contain a non-empty JSON body
 * Conforms to docs/api-contract.md requirement: returns 400 BAD_REQUEST for empty bodies
 */
const requireNonEmptyBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    const error = new Error('Request body cannot be empty');
    error.status = 400;
    error.code = 'BAD_REQUEST';
    return next(error);
  }
  next();
};

// GET /api/v1/applications - List applications with pagination, filters, search, and sorting
router.get(
  '/',
  validate({ query: listApplicationsQuerySchema }),
  applicationController.list
);

// GET /api/v1/applications/:applicationId - Retrieve a single application by ID
router.get(
  '/:applicationId',
  validate({ params: applicationIdParamSchema }),
  applicationController.getById
);

// POST /api/v1/applications - Create a new target application
router.post(
  '/',
  validate({ body: createApplicationBodySchema }),
  applicationController.create
);

// PATCH /api/v1/applications/:applicationId - Partially update an application
router.patch(
  '/:applicationId',
  validate({ params: applicationIdParamSchema }),
  requireNonEmptyBody,
  validate({ body: updateApplicationBodySchema }),
  applicationController.update
);

// GET /api/v1/applications/:applicationId/accounts - List accounts provisioned within a target application
router.get(
  '/:applicationId/accounts',
  validate({ params: applicationIdParamSchema, query: listAccountsQuerySchema }),
  accountController.getAccountsByApplication
);

export default router;
