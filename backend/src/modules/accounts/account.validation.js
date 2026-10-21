import { z } from 'zod';

/**
 * Account Zod Validation Schemas
 * Conforms to docs/api-contract.md Sections 5.4, 6 & 14.3 and docs/data-model.md Section 3.3
 */

// Allowlisted columns for sorting (docs/api-contract.md Section 6.3)
export const ALLOWED_SORT_FIELDS = [
  'external_id',
  'account_name',
  'email',
  'status',
  'source',
  'last_login_at',
  'created_at',
  'updated_at'
];

export const ACCOUNT_STATUSES = ['active', 'disabled', 'suspended', 'unknown'];

/**
 * Path parameter validation for /accounts/:accountId
 */
export const accountIdParamSchema = z.object({
  accountId: z.string().uuid({ message: 'Account ID must be a valid UUID' })
});

/**
 * Path parameter validation for /identities/:identityId/accounts
 */
export const identityIdParamSchema = z.object({
  identityId: z.string().uuid({ message: 'Identity ID must be a valid UUID' })
});

/**
 * Path parameter validation for /applications/:applicationId/accounts
 */
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
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
 * Query parameter validation for GET /accounts
 */
export const listAccountsQuerySchema = z.object({
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
  identity_id: z.string().uuid({ message: 'Identity ID filter must be a valid UUID' }).optional(),
  status: z.enum(ACCOUNT_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}` })
  }).optional(),
  is_orphan: booleanQuerySchema.optional(),
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
 * Body validation for POST /accounts
 * Enforces strict schema to prevent unknown/forbidden fields
 */
export const createAccountBodySchema = z
  .object({
    application_id: z
      .string({ required_error: 'Application ID is required' })
      .uuid({ message: 'Application ID must be a valid UUID' }),
    external_id: z
      .string({ required_error: 'External ID is required' })
      .trim()
      .min(1, { message: 'External ID cannot be empty' })
      .max(255, { message: 'External ID cannot exceed 255 characters' }),
    identity_id: z
      .string()
      .uuid({ message: 'Identity ID must be a valid UUID' })
      .nullable()
      .optional(),
    account_name: z
      .string()
      .trim()
      .max(255, { message: 'Account name cannot exceed 255 characters' })
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .email({ message: 'Invalid email address format' })
      .max(255, { message: 'Email cannot exceed 255 characters' })
      .nullable()
      .optional(),
    status: z
      .enum(ACCOUNT_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}` })
      })
      .default('active'),
    source: z
      .string()
      .trim()
      .max(100, { message: 'Source cannot exceed 100 characters' })
      .default('direct'),
    last_login_at: z
      .string()
      .datetime({ message: 'Last login must be a valid ISO 8601 timestamp' })
      .nullable()
      .optional()
  })
  .strict({ message: 'Request contains unrecognized or forbidden fields' });

/**
 * Body validation for PATCH /accounts/:accountId
 * Rejects unknown fields; empty body check is performed at router middleware level
 */
export const updateAccountBodySchema = z
  .object({
    external_id: z
      .string()
      .trim()
      .min(1, { message: 'External ID cannot be empty' })
      .max(255, { message: 'External ID cannot exceed 255 characters' })
      .optional(),
    identity_id: z
      .string()
      .uuid({ message: 'Identity ID must be a valid UUID' })
      .nullable()
      .optional(),
    account_name: z
      .string()
      .trim()
      .max(255, { message: 'Account name cannot exceed 255 characters' })
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .email({ message: 'Invalid email address format' })
      .max(255, { message: 'Email cannot exceed 255 characters' })
      .nullable()
      .optional(),
    status: z
      .enum(ACCOUNT_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}` })
      })
      .optional(),
    source: z
      .string()
      .trim()
      .max(100, { message: 'Source cannot exceed 100 characters' })
      .optional(),
    last_login_at: z
      .string()
      .datetime({ message: 'Last login must be a valid ISO 8601 timestamp' })
      .nullable()
      .optional()
  })
  .strict({ message: 'Request contains unrecognized or forbidden fields' });
