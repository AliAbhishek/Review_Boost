import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Restaurant, BUSINESS_TYPES } from '../models/Restaurant';
import { ReviewLog } from '../models/ReviewLog';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { generateUniqueSlug } from '../utils/slugify';
import { generateQRCode } from '../services/qrService';
import { sendOwnerInviteEmail } from '../services/emailService';
import { logger } from '../utils/logger';

// Minimal 3-field schema — gets a business live in under 30 seconds
export const createRestaurantSchema = z.object({
  name:         z.string().min(2).max(200),
  businessType: z.enum(BUSINESS_TYPES),
  ownerEmail:   z.string().email(),
});

// Full schema for subsequent edits via admin or owner dashboard
export const updateRestaurantSchema = z.object({
  name:          z.string().min(2).max(200).optional(),
  businessType:  z.enum(BUSINESS_TYPES).optional(),
  services:      z.array(z.string()).max(10).optional(),
  description:   z.string().max(500).optional(),
  cuisine:       z.string().max(100).optional(),
  city:          z.string().max(100).optional(),
  state:         z.string().max(100).optional(),
  googleMapsUrl:   z.string().url().optional().or(z.literal('')),
  googleReviewUrl: z.string().url().optional().or(z.literal('')),
  zomatoUrl:       z.string().url().optional().or(z.literal('')),
  logoColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ownerPhone:    z.string().min(7).max(20).optional(),
  plan:          z.enum(['trial', 'basic', 'pro']).optional(),
  trialEndsAt:   z.string().datetime().optional(),
  isActive:      z.boolean().optional(),
});

export const createRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof createRestaurantSchema>;
  const slug = await generateUniqueSlug(data.name);

  const restaurant = await Restaurant.create({
    name: data.name,
    businessType: data.businessType,
    ownerEmail: data.ownerEmail,
    slug,
  });

  sendOwnerInviteEmail(data.ownerEmail, data.name, restaurant._id.toString()).catch((err) =>
    logger.error('Failed to send owner invite email', { err, restaurantId: restaurant._id }),
  );

  res.created({ restaurant });
});

export const getAllRestaurants = asyncHandler(async (_req: Request, res: Response) => {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();

  const restaurantIds = restaurants.map((r) => r._id);
  const reviewCounts = await ReviewLog.aggregate([
    { $match: { restaurantId: { $in: restaurantIds } } },
    { $group: { _id: '$restaurantId', count: { $sum: 1 }, avgStars: { $avg: '$stars' } } },
  ]);

  const countMap = new Map(
    reviewCounts.map((rc) => [
      rc._id.toString(),
      { count: rc.count as number, avgStars: rc.avgStars as number },
    ]),
  );

  const data = restaurants.map((r) => ({
    ...r,
    reviewStats: countMap.get(r._id.toString()) ?? { count: 0, avgStars: 0 },
  }));

  res.success({ restaurants: data, total: data.length });
});

export const getRestaurantBySlug = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug }).lean();
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const reviewStats = await ReviewLog.aggregate([
    { $match: { restaurantId: restaurant._id } },
    { $group: { _id: null, count: { $sum: 1 }, avgStars: { $avg: '$stars' } } },
  ]);

  res.success({ restaurant, reviewStats: reviewStats[0] ?? { count: 0, avgStars: 0 } });
});

export const updateRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid ID', 400);

  const updates = req.body as z.infer<typeof updateRestaurantSchema>;

  if (updates.name) {
    const current = await Restaurant.findById(id);
    if (!current) throw new AppError('Restaurant not found', 404);
    (updates as Record<string, unknown>)['slug'] = await generateUniqueSlug(
      updates.name,
      updates.city ?? current.city,
      id,
    );
  }

  const restaurant = await Restaurant.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  res.success({ restaurant });
});

export const deleteRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid ID', 400);

  const restaurant = await Restaurant.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  res.success({ message: 'Business deactivated', restaurant });
});

export const getQRCode = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const buffer = await generateQRCode(req.params.slug);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.slug}-qr.png"`);
  res.send(buffer);
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalRestaurants, totalReviews, planBreakdown] = await Promise.all([
    Restaurant.countDocuments({ isActive: true }),
    ReviewLog.countDocuments(),
    Restaurant.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
  ]);

  let activePlans = 0;
  for (const p of planBreakdown) {
    if (p._id === 'basic' || p._id === 'pro') activePlans += p.count as number;
  }

  res.success({ totalRestaurants, totalReviews, activePlans, revenue: 0 });
});
