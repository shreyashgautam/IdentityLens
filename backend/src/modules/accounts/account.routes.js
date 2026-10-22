import { Router } from 'express';
import * as accountController from './account.controller.js';
import * as entitlementController from '../entitlements/entitlement.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  accountIdParamSchema,
  listAccountsQuerySchema,
  createAccountBodySchema,
  updateAccountBodySchema
} from './account.validation.js';
import {
  listAccountEntitlementsQuerySchema,
  assignEntitlementBodySchema,
  accountEntitlementParamSchema
} from '../entitlements/entitlement.validation.js';

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

// Milestone 5 — Account Entitlement Assignment Routes (docs/api-contract.md Section 14.3 & 14.4)

// GET /api/v1/accounts/:accountId/entitlements - List entitlements assigned to an account
router.get(
  '/:accountId/entitlements',
  validate({ params: accountIdParamSchema, query: listAccountEntitlementsQuerySchema }),
  entitlementController.listForAccount
);

// POST /api/v1/accounts/:accountId/entitlements - Assign an entitlement to an account
router.post(
  '/:accountId/entitlements',
  validate({ params: accountIdParamSchema, body: assignEntitlementBodySchema }),
  entitlementController.assignToAccount
);

// DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId - Remove an entitlement assignment
router.delete(
  '/:accountId/entitlements/:entitlementId',
  validate({ params: accountEntitlementParamSchema }),
  entitlementController.removeFromAccount
);

export default router;
