import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import healthRoutes from '../modules/health/health.routes.js';
import identityRoutes from '../modules/identities/identity.routes.js';
import applicationRoutes from '../modules/applications/application.routes.js';
import accountRoutes from '../modules/accounts/account.routes.js';
import entitlementRoutes from '../modules/entitlements/entitlement.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import { authenticate, requireVerifiedEmail } from '../middlewares/auth.js';
import { openApiSpec, swaggerOptions } from '../config/swagger.js';

const router = Router();

// Swagger Interactive API Documentation (/docs and /docs/openapi.json)
router.get('/docs/openapi.json', (req, res) => {
  res.status(200).json(openApiSpec);
});
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));

// Liveness check outside versioned prefix (docs/api-contract.md Section 3 & 14.8)
router.use('/health', healthRoutes);

// Root informational endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'IVIP Mini API Server',
    health: '/health',
    api_base: '/api/v1',
    docs: '/docs'
  });
});

// Versioned API Router (/api/v1)
const v1Router = Router();

// Milestone 6 — Authentication Endpoints (Public exchange & refresh/logout)
v1Router.use('/auth', authRoutes);

// Milestone 4 & 5 — Protected Inventory Modules (Requires authenticated session & verified email)
v1Router.use('/identities', authenticate, requireVerifiedEmail, identityRoutes);
v1Router.use('/applications', authenticate, requireVerifiedEmail, applicationRoutes);
v1Router.use('/accounts', authenticate, requireVerifiedEmail, accountRoutes);
v1Router.use('/entitlements', authenticate, requireVerifiedEmail, entitlementRoutes);
// v1Router.use('/risk-findings', riskRoutes);

v1Router.get('/', (req, res) => {
  res.status(200).json({
    version: 'v1',
    status: 'operational',
    endpoints: [
      '/auth',
      '/identities',
      '/applications',
      '/accounts',
      '/entitlements',
      '/risk-findings'
    ]
  });
});

router.use('/api/v1', v1Router);

export default router;
