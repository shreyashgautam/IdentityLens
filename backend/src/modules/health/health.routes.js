import { Router } from 'express';
import * as healthController from './health.controller.js';

const router = Router();

// GET /health - General health and metadata
router.get('/', healthController.checkHealth);

// GET /health/live - Liveness probe (Kubernetes/container process check)
router.get('/live', healthController.checkLiveness);

// GET /health/ready - Readiness probe (traffic routing readiness)
router.get('/ready', healthController.checkReadiness);

export default router;
