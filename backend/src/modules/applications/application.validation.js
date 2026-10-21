import { z } from 'zod';

/**
 * Application Zod Validation Schemas
 * Conforms to docs/api-contract.md Sections 5.4, 6 & 14.2 and docs/data-model.md Section 3.2
 */

// Allowlisted columns for sorting applications (docs/api-contract.md Section 6.3)
export const ALLOWED_APPLICATION_SORT_FIELDS = [
  'name',
  'key',
  'status',
  'auth_type',
  'created_at',
  'updated_at'
];

export const APPLICATION_STATUSES = ['active', 'inactive', 'deprecated'];

/**
 * Path parameter validation for /applications/:applicationId
 */
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
});

/**
 * Query parameter validation for GET /applications
 */
export const listApplicationsQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int({ message: 'Page must be an integer' })
    .min(1, { message: 'Page must be greater than or equal to 1' })
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be greater than or equal to 1' })
    .max(100, { message: 'Limit cannot exceed 100' })
    .default(20),
  status: z.enum(APPLICATION_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` })
  }).optional(),
  auth_type: z.string().trim().max(50, { message: 'Auth type cannot exceed 50 characters' }).optional(),
  search: z.string().trim().max(100, { message: 'Search term cannot exceed 100 characters' }).optional(),
  sort_by: z
    .string()
    .refine((val) => ALLOWED_APPLICATION_SORT_FIELDS.includes(val), {
      message: `Sort field must be one of: ${ALLOWED_APPLICATION_SORT_FIELDS.join(', ')}`
    })
    .default('created_at'),
  sort_order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' })
    })
    .default('desc')
});

/**
 * Body validation for POST /applications
 * Strict schema rejecting unknown or forbidden properties
 */
export const createApplicationBodySchema = z
  .object({
    name: z
      .string({ required_error: 'Application name is required' })
      .trim()
      .min(1, { message: 'Application name cannot be empty' })
      .max(255, { message: 'Application name cannot exceed 255 characters' }),
    key: z
      .string({ required_error: 'Application key is required' })
      .trim()
      .toLowerCase()
      .min(1, { message: 'Application key cannot be empty' })
      .max(100, { message: 'Application key cannot exceed 100 characters' })
      .regex(/^[a-z0-9_-]+$/, {
        message: 'Application key must contain only lowercase alphanumeric characters, dashes, and underscores'
      }),
    description: z
      .string()
      .trim()
      .nullable()
      .optional(),
    status: z
      .enum(APPLICATION_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` })
      })
      .default('active'),
    auth_type: z
      .string()
      .trim()
      .max(50, { message: 'Auth type cannot exceed 50 characters' })
      .default('password')
      .optional()
  })
  .strict({ message: 'Unknown fields are not permitted in request body' });

/**
 * Body validation for PATCH /applications/:applicationId
 * Requires at least one field and uses .strict()
 */
export const updateApplicationBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Application name cannot be empty' })
      .max(255, { message: 'Application name cannot exceed 255 characters' })
      .optional(),
    key: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, { message: 'Application key cannot be empty' })
      .max(100, { message: 'Application key cannot exceed 100 characters' })
      .regex(/^[a-z0-9_-]+$/, {
        message: 'Application key must contain only lowercase alphanumeric characters, dashes, and underscores'
      })
      .optional(),
    description: z
      .string()
      .trim()
      .nullable()
      .optional(),
    status: z
      .enum(APPLICATION_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` })
      })
      .optional(),
    auth_type: z
      .string()
      .trim()
      .max(50, { message: 'Auth type cannot exceed 50 characters' })
      .optional()
  })
  .strict({ message: 'Unknown fields are not permitted in request body' })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Request body must contain at least one field to update'
  });
