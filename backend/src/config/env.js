import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // PostgreSQL Connection Configuration (Conforms to docs/architecture.md & docs/data-model.md)
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('identitylens'),
  DB_USER: z.string().default(process.env.USER || 'shreyashgautam'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
      return Boolean(val);
    }, z.boolean())
    .default(false),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(2000),

  // Authentication & Session Configuration (Milestone 6 Phase 1)
  JWT_ACCESS_SECRET: z.string().min(16).default('identitylens-dev-access-token-secret-min32chars!!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
