import * as healthService from './health.service.js';

/**
 * Health Controller
 * Maps HTTP requests to healthService output
 */

export const checkHealth = (req, res, next) => {
  try {
    const health = healthService.getSystemHealth();
    return res.status(200).json(health);
  } catch (err) {
    next(err);
  }
};

export const checkLiveness = (req, res, next) => {
  try {
    const liveness = healthService.getLiveness();
    return res.status(200).json(liveness);
  } catch (err) {
    next(err);
  }
};

export const checkReadiness = (req, res, next) => {
  try {
    const readiness = healthService.getReadiness();
    return res.status(200).json(readiness);
  } catch (err) {
    next(err);
  }
};
