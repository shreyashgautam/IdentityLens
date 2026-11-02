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

/**
 * Body validation schema for POST /api/v1/auth/login
 * Validates corporate email or username and password
 */
export const loginBodySchema = z
  .object({
    email: z
      .string({ required_error: 'Email or username is required' })
      .trim()
      .min(3, { message: 'Email or username must be at least 3 characters' })
      .transform((val) => (val.includes('@') ? val.toLowerCase() : `${val.toLowerCase()}@identitylens.io`)),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' })
  })
  .strict({ message: 'Unknown fields are not permitted in request body' });

/**
 * Body validation schema for POST /api/v1/auth/register
 * Validates organization name, corporate email/username, and password
 */
export const registerBodySchema = z
  .object({
    organization: z
      .string({ required_error: 'Organization name is required' })
      .trim()
      .min(2, { message: 'Organization name must be at least 2 characters' })
      .max(100, { message: 'Organization name cannot exceed 100 characters' }),
    email: z
      .string({ required_error: 'Work email or username is required' })
      .trim()
      .min(3, { message: 'Email or username must be at least 3 characters' })
      .transform((val) => (val.includes('@') ? val.toLowerCase() : `${val.toLowerCase()}@identitylens.io`)),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' }),
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
  })
  .strict({ message: 'Unknown fields are not permitted in request body' });
