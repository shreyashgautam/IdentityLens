import { z } from 'zod';

/**
 * Identity Zod Validation Schemas
 * Conforms to docs/api-contract.md Sections 5.4, 6 & 14.1 and docs/data-model.md Section 3.1
 */

// Allowlisted columns for sorting (docs/api-contract.md Section 6.3)
export const ALLOWED_SORT_FIELDS = [
  'display_name',
  'email',
  'status',
  'identity_type',
  'department',
  'created_at',
  'updated_at'
];

export const IDENTITY_TYPES = ['human', 'service_account', 'bot', 'ai_agent'];
export const IDENTITY_STATUSES = ['active', 'inactive', 'suspended', 'unknown'];

/**
 * Path parameter validation for /identities/:identityId
 */
export const identityIdParamSchema = z.object({
  identityId: z.string().uuid({ message: 'Identity ID must be a valid UUID' })
});

/**
 * Query parameter validation for GET /identities
 */
export const listIdentitiesQuerySchema = z.object({
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
  status: z.enum(IDENTITY_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${IDENTITY_STATUSES.join(', ')}` })
  }).optional(),
  identity_type: z.enum(IDENTITY_TYPES, {
    errorMap: () => ({ message: `Identity type must be one of: ${IDENTITY_TYPES.join(', ')}` })
  }).optional(),
  department: z.string().trim().max(100, { message: 'Department cannot exceed 100 characters' }).optional(),
  search: z.string().trim().max(100, { message: 'Search term cannot exceed 100 characters' }).optional(),
  sort_by: z
    .string()
    .refine((val) => ALLOWED_SORT_FIELDS.includes(val), {
      message: `Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`
    })
    .default('created_at'),
  sort_order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' })
    })
    .default('desc')
});

/**
 * Body validation for POST /identities
 * Uses .strict() to reject forbidden/unknown fields
 */
export const createIdentityBodySchema = z
  .object({
    display_name: z
      .string({ required_error: 'Display name is required' })
      .trim()
      .min(1, { message: 'Display name cannot be empty' })
      .max(255, { message: 'Display name cannot exceed 255 characters' }),
    identity_type: z.enum(IDENTITY_TYPES, {
      errorMap: () => ({ message: `Identity type must be one of: ${IDENTITY_TYPES.join(', ')}` })
    }),
    email: z
      .string()
      .trim()
      .email({ message: 'Invalid email address format' })
      .max(255, { message: 'Email cannot exceed 255 characters' })
      .nullable()
      .optional(),
    status: z
      .enum(IDENTITY_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${IDENTITY_STATUSES.join(', ')}` })
      })
      .default('active'),
    owner_id: z
      .string()
      .uuid({ message: 'Owner ID must be a valid UUID' })
      .nullable()
      .optional(),
    department: z
      .string()
      .trim()
      .max(100, { message: 'Department cannot exceed 100 characters' })
      .nullable()
      .optional(),
    title: z
      .string()
      .trim()
      .max(150, { message: 'Title cannot exceed 150 characters' })
      .nullable()
      .optional()
  })
  .strict({ message: 'Unknown fields are not permitted in request body' });

/**
 * Body validation for PATCH /identities/:identityId
 * Requires at least one field to be updated and uses .strict()
 */
export const updateIdentityBodySchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, { message: 'Display name cannot be empty' })
      .max(255, { message: 'Display name cannot exceed 255 characters' })
      .optional(),
    identity_type: z
      .enum(IDENTITY_TYPES, {
        errorMap: () => ({ message: `Identity type must be one of: ${IDENTITY_TYPES.join(', ')}` })
      })
      .optional(),
    email: z
      .string()
      .trim()
      .email({ message: 'Invalid email address format' })
      .max(255, { message: 'Email cannot exceed 255 characters' })
      .nullable()
      .optional(),
    status: z
      .enum(IDENTITY_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${IDENTITY_STATUSES.join(', ')}` })
      })
      .optional(),
    owner_id: z
      .string()
      .uuid({ message: 'Owner ID must be a valid UUID' })
      .nullable()
      .optional(),
    department: z
      .string()
      .trim()
      .max(100, { message: 'Department cannot exceed 100 characters' })
      .nullable()
      .optional(),
    title: z
      .string()
      .trim()
      .max(150, { message: 'Title cannot exceed 150 characters' })
      .nullable()
      .optional()
  })
  .strict({ message: 'Unknown fields are not permitted in request body' })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Request body must contain at least one field to update'
  });
