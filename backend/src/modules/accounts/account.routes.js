import { Router } from 'express';
import * as accountController from './account.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  accountIdParamSchema,
  listAccountsQuerySchema,
  createAccountBodySchema,
  updateAccountBodySchema
} from './account.validation.js';

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

// GET /api/v1/accounts - List accounts with pagination, filters, search, and sorting
router.get(
  '/',
  validate({ query: listAccountsQuerySchema }),
  accountController.list
);

// GET /api/v1/accounts/:accountId - Retrieve a single account by ID
router.get(
  '/:accountId',
  validate({ params: accountIdParamSchema }),
  accountController.getById
);

// POST /api/v1/accounts - Create a new target account
router.post(
  '/',
  validate({ body: createAccountBodySchema }),
  accountController.create
);

// PATCH /api/v1/accounts/:accountId - Partially update an account
router.patch(
  '/:accountId',
  validate({ params: accountIdParamSchema }),
  requireNonEmptyBody,
  validate({ body: updateAccountBodySchema }),
  accountController.update
);

export default router;
