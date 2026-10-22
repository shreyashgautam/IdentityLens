import { z } from 'zod';

/**
 * Entitlement Zod Validation Schemas
 * Conforms to docs/api-contract.md Sections 5.4, 6 & 14.4 and docs/data-model.md Section 3.4 & 3.5
 */

// Allowlisted columns for sorting entitlements (docs/api-contract.md Section 6.3)
export const ALLOWED_ENTITLEMENT_SORT_FIELDS = [
  'name',
  'type',
  'is_privileged',
  'created_at',
  'updated_at'
];

export const ENTITLEMENT_TYPES = ['role', 'group', 'permission', 'license'];

/**
 * Path parameter validation for /entitlements/:entitlementId
 */
export const entitlementIdParamSchema = z.object({
  entitlementId: z.string().uuid({ message: 'Entitlement ID must be a valid UUID' })
});

/**
 * Path parameter validation for /accounts/:accountId/entitlements/:entitlementId
 */
export const accountEntitlementParamSchema = z.object({
  accountId: z.string().uuid({ message: 'Account ID must be a valid UUID' }),
  entitlementId: z.string().uuid({ message: 'Entitlement ID must be a valid UUID' })
});

/**
 * Path parameter validation for /accounts/:accountId/entitlements
 */
export const accountIdParamSchema = z.object({
  accountId: z.string().uuid({ message: 'Account ID must be a valid UUID' })
});

/**
 * Helper to safely coerce boolean strings ('true'/'false'/'1'/'0')
 */
const booleanQuerySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return val;
}, z.boolean({ invalid_type_error: 'Must be a boolean value (true or false)' }));

/**
 * Query parameter validation for GET /entitlements
 */
export const listEntitlementsQuerySchema = z.object({
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
  application_id: z.string().uuid({ message: 'Application ID filter must be a valid UUID' }).optional(),
  type: z.enum(ENTITLEMENT_TYPES, {
    errorMap: () => ({ message: `Type must be one of: ${ENTITLEMENT_TYPES.join(', ')}` })
  }).optional(),
  is_privileged: booleanQuerySchema.optional(),
  search: z.string().trim().max(100, { message: 'Search term cannot exceed 100 characters' }).optional(),
  sort_by: z
    .string()
    .refine((val) => ALLOWED_ENTITLEMENT_SORT_FIELDS.includes(val), {
      message: `Sort field must be one of: ${ALLOWED_ENTITLEMENT_SORT_FIELDS.join(', ')}`
    })
    .default('created_at'),
  sort_order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' })
    })
    .default('desc')
});

/**
 * Query parameter validation for GET /accounts/:accountId/entitlements
 */
export const listAccountEntitlementsQuerySchema = z.object({
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
  type: z.enum(ENTITLEMENT_TYPES).optional(),
  is_privileged: booleanQuerySchema.optional(),
  sort_by: z
    .string()
    .refine((val) => ALLOWED_ENTITLEMENT_SORT_FIELDS.includes(val), {
      message: `Sort field must be one of: ${ALLOWED_ENTITLEMENT_SORT_FIELDS.join(', ')}`
    })
    .default('created_at'),
  sort_order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' })
    })
    .default('desc')
});

/**
 * Body validation for POST /entitlements
 */
export const createEntitlementBodySchema = z
  .object({
    application_id: z
      .string({ required_error: 'Application ID is required' })
      .uuid({ message: 'Application ID must be a valid UUID' }),
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, { message: 'Name cannot be empty' })
      .max(255, { message: 'Name cannot exceed 255 characters' }),
    external_id: z
      .string()
      .trim()
      .max(255, { message: 'External ID cannot exceed 255 characters' })
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .nullable()
      .optional(),
    type: z
      .enum(ENTITLEMENT_TYPES, {
        errorMap: () => ({ message: `Type must be one of: ${ENTITLEMENT_TYPES.join(', ')}` })
      })
      .default('role'),
    is_privileged: z
      .boolean({ invalid_type_error: 'is_privileged must be a boolean' })
      .default(false)
  })
  .strict({ message: 'Request contains unrecognized or forbidden fields' });

/**
 * Body validation for PATCH /entitlements/:entitlementId
 */
export const updateEntitlementBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Name cannot be empty' })
      .max(255, { message: 'Name cannot exceed 255 characters' })
      .optional(),
    external_id: z
      .string()
      .trim()
      .max(255, { message: 'External ID cannot exceed 255 characters' })
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .nullable()
      .optional(),
    type: z
      .enum(ENTITLEMENT_TYPES, {
        errorMap: () => ({ message: `Type must be one of: ${ENTITLEMENT_TYPES.join(', ')}` })
      })
      .optional(),
    is_privileged: z
      .boolean({ invalid_type_error: 'is_privileged must be a boolean' })
      .optional()
  })
  .strict({ message: 'Request contains unrecognized or forbidden fields' });

/**
 * Body validation for POST /accounts/:accountId/entitlements
 */
export const assignEntitlementBodySchema = z
  .object({
    entitlement_id: z
      .string({ required_error: 'Entitlement ID is required' })
      .uuid({ message: 'Entitlement ID must be a valid UUID' })
  })
  .strict({ message: 'Request contains unrecognized or forbidden fields' });
