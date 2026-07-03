import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env.{NODE_ENV} — e.g. .env.development, .env.staging, .env.production.
// Falls back to 'development' if NODE_ENV is not set.
// dotenv.config() is a no-op if the file doesn't exist (tests set vars via envSetup.ts).
const nodeEnv = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLAUDE_API_KEY: z.string().min(1, 'CLAUDE_API_KEY is required'),
  ADMIN_SECRET: z.string().min(1, 'ADMIN_SECRET is required'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'debug'])
    .default('info'),
  CORS_ORIGIN: z.string().default('*'),
  // Email (SMTP)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('ReviewBoost <noreply@reviewboost.in>'),
  // Frontend base URL — used for invite links in emails
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Cloudinary — logo uploads
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY:    z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌  Invalid environment variables:\n', result.error.format());
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
