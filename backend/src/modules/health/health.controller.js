import * as healthService from './health.service.js';

/**
 * Health Controller
 * Maps HTTP request to healthService output
 */
export const checkHealth = (req, res, next) => {
  try {
    const health = healthService.getSystemHealth();
    return res.status(200).json(health);
  } catch (err) {
    next(err);
  }
};
