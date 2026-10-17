import { Router } from 'express';
import * as healthController from './health.controller.js';

const router = Router();

// GET /health
router.get('/', healthController.checkHealth);

export default router;
