import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { env } from '../config/env';
import { logger } from './logger';

export async function seedAdmin(): Promise<void> {
  const existing = await Admin.findOne({ email: env.ADMIN_EMAIL });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await Admin.create({ name: 'Admin', email: env.ADMIN_EMAIL, passwordHash });
  logger.info(`Admin account created — ${env.ADMIN_EMAIL}`);
}
