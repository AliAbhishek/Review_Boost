import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Admin } from '../models/Admin';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { signAdminToken } from '../middleware/auth';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof adminLoginSchema>;

  const admin = await Admin.findOne({ email }).select('+passwordHash');
  if (!admin) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  admin.lastLogin = new Date();
  await admin.save();

  const token = signAdminToken(admin._id, admin.email);

  res.success({
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});
