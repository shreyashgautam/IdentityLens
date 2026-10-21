import { Router } from 'express';
import * as identityController from './identity.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  identityIdParamSchema,
  listIdentitiesQuerySchema,
  createIdentityBodySchema,
  updateIdentityBodySchema
} from './identity.validation.js';

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

// GET /api/v1/identities - List identities with pagination, filters, search, and sorting
router.get(
  '/',
  validate({ query: listIdentitiesQuerySchema }),
  identityController.list
);

// GET /api/v1/identities/:identityId - Retrieve a single identity by ID
router.get(
  '/:identityId',
  validate({ params: identityIdParamSchema }),
  identityController.getById
);

// POST /api/v1/identities - Create a new canonical identity
router.post(
  '/',
  validate({ body: createIdentityBodySchema }),
  identityController.create
);

// PATCH /api/v1/identities/:identityId - Partially update an identity
router.patch(
  '/:identityId',
  validate({ params: identityIdParamSchema }),
  requireNonEmptyBody,
  validate({ body: updateIdentityBodySchema }),
  identityController.update
);

export default router;
