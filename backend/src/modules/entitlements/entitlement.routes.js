import { Router } from 'express';
import * as entitlementController from './entitlement.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  entitlementIdParamSchema,
  listEntitlementsQuerySchema,
  createEntitlementBodySchema,
  updateEntitlementBodySchema
} from './entitlement.validation.js';

const router = Router();

/**
 * Middleware ensuring PATCH requests contain a non-empty JSON body
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

// GET /api/v1/entitlements - List cataloged entitlements with pagination, filters, search, and sorting
router.get(
  '/',
  validate({ query: listEntitlementsQuerySchema }),
  entitlementController.list
);

// GET /api/v1/entitlements/:entitlementId - Retrieve a single entitlement definition by ID
router.get(
  '/:entitlementId',
  validate({ params: entitlementIdParamSchema }),
  entitlementController.getById
);

// POST /api/v1/entitlements - Create a new entitlement definition
router.post(
  '/',
  validate({ body: createEntitlementBodySchema }),
  entitlementController.create
);

// PATCH /api/v1/entitlements/:entitlementId - Partially update an entitlement definition
router.patch(
  '/:entitlementId',
  validate({ params: entitlementIdParamSchema }),
  requireNonEmptyBody,
  validate({ body: updateEntitlementBodySchema }),
  entitlementController.update
);

export default router;
