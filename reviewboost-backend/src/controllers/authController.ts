import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Owner } from '../models/Owner';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { signOwnerToken } from '../middleware/auth';
import { sendWelcomeEmail } from '../services/emailService';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  restaurantId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid restaurant ID'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});


export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, restaurantId } = req.body as z.infer<typeof registerSchema>;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const existing = await Owner.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await Owner.create({ name, email, passwordHash, restaurantId: restaurant._id });

  sendWelcomeEmail(email, name, restaurant.name);

  const token = signOwnerToken(owner._id, restaurant._id);

  res.created({ token, owner: { id: owner._id, name: owner.name, email: owner.email } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const owner = await Owner.findOne({ email }).select('+passwordHash');
  if (!owner) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, owner.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  owner.lastLogin = new Date();
  await owner.save();

  const token = signOwnerToken(owner._id, owner.restaurantId);

  res.success({ token, owner: { id: owner._id, name: owner.name, email: owner.email } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const owner = await Owner.findById(req.owner!.id).populate('restaurantId');
  if (!owner) throw new AppError('Owner not found', 404);

  res.success({
    owner: {
      id: owner._id,
      name: owner.name,
      email: owner.email,
      restaurantId: owner.restaurantId,
      createdAt: owner.createdAt,
      lastLogin: owner.lastLogin,
    },
  });
});

