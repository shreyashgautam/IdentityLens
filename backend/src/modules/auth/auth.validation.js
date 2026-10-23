import { z } from 'zod';

/**
 * Authentication Zod Validation Schemas
 * Conforms to Milestone 6 Phase 1 Specification
 */

/**
 * Body validation schema for POST /api/v1/auth/firebase/exchange
 * Uses .strict() to reject client-supplied roles, status, or any forbidden fields
 */
export const exchangeBodySchema = z
  .object({
    idToken: z
      .string({ required_error: 'Firebase ID token is required' })
      .trim()
      .min(1, { message: 'Firebase ID token cannot be empty' })
  })
  .strict({ message: 'Unknown fields are not permitted in request body' });
