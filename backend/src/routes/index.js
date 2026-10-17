import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';

const router = Router();

// Liveness check outside versioned prefix (docs/api-contract.md Section 3 & 14.8)
router.use('/health', healthRoutes);

// Root informational endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'IVIP Mini API Server',
    health: '/health',
    api_base: '/api/v1',
    docs: 'docs/api-contract.md'
  });
});

// Versioned API Router (/api/v1)
const v1Router = Router();

// Future feature modules will mount here:
// v1Router.use('/identities', identityRoutes);
// v1Router.use('/applications', applicationRoutes);
// v1Router.use('/accounts', accountRoutes);
// v1Router.use('/entitlements', entitlementRoutes);
// v1Router.use('/risk-findings', riskRoutes);

v1Router.get('/', (req, res) => {
  res.status(200).json({
    version: 'v1',
    status: 'operational',
    endpoints: [
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
