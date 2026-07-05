import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Restaurant, BUSINESS_TYPES } from '../models/Restaurant';
import { ReviewLog } from '../models/ReviewLog';
import { Order } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { Bill } from '../models/Bill';
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
  upiId:         z.string().max(100).optional().or(z.literal('')),
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

  sendOwnerInviteEmail(data.ownerEmail, data.name, restaurant._id.toString());

  res.created({ restaurant });
});

export const getAllRestaurants = asyncHandler(async (_req: Request, res: Response) => {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();

  const restaurantIds = restaurants.map((r) => r._id);
  const [reviewCounts, orderCounts] = await Promise.all([
    ReviewLog.aggregate([
      { $match: { restaurantId: { $in: restaurantIds } } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 }, avgStars: { $avg: '$stars' } } },
    ]),
    Order.aggregate([
      { $match: { restaurantId: { $in: restaurantIds } } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
    ]),
  ]);

  const reviewMap = new Map(
    reviewCounts.map((rc) => [
      rc._id.toString(),
      { count: rc.count as number, avgStars: rc.avgStars as number },
    ]),
  );
  const orderMap = new Map(
    orderCounts.map((oc) => [oc._id.toString(), oc.count as number]),
  );

  const data = restaurants.map((r) => ({
    ...r,
    reviewStats: reviewMap.get(r._id.toString()) ?? { count: 0, avgStars: 0 },
    orderCount: orderMap.get(r._id.toString()) ?? 0,
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

export const getRestaurantOverview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid ID', 400);

  const rid = new Types.ObjectId(id);

  const [restaurant, menuItems, recentOrders, recentBills, recentReviews, totalOrders, billAgg, reviewAgg, staffAgg] =
    await Promise.all([
      Restaurant.findById(id).lean(),
      MenuItem.find({ restaurantId: rid }).sort({ category: 1, name: 1 }).lean(),
      Order.find({ restaurantId: rid }).sort({ createdAt: -1 }).limit(20).lean(),
      Bill.find({ restaurantId: rid }).sort({ createdAt: -1 }).limit(20).lean(),
      ReviewLog.find({ restaurantId: rid }).sort({ timestamp: -1 }).limit(20).lean(),
      Order.countDocuments({ restaurantId: rid }),
      Bill.aggregate([
        { $match: { restaurantId: rid } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      ReviewLog.aggregate([
        { $match: { restaurantId: rid } },
        { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$stars' } } },
      ]),
      Bill.aggregate([
        { $match: { restaurantId: rid, staffName: { $exists: true, $ne: null } } },
        { $group: { _id: '$staffName', bills: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const billStat   = billAgg[0]   ?? { total: 0, count: 0 };
  const reviewStat = reviewAgg[0] ?? { count: 0, avg: 0 };

  res.success({
    restaurant,
    menuItems,
    recentOrders,
    recentBills,
    recentReviews,
    staffStats: staffAgg.map((s) => ({
      name:    s._id    as string,
      bills:   s.bills  as number,
      revenue: s.revenue as number,
    })),
    stats: {
      totalOrders,
      totalBills:    billStat.count  as number,
      totalRevenue:  billStat.total  as number,
      totalReviews:  reviewStat.count as number,
      avgRating:     Number(((reviewStat.avg as number) || 0).toFixed(1)),
      menuItemCount: menuItems.length,
    },
  });
});

export const getRestaurantMenu = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid ID', 400);

  const items = await MenuItem.find({ restaurantId: id })
    .sort({ category: 1, name: 1 })
    .lean();

  res.success({ items });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalRestaurants, totalReviews, totalOrders, planBreakdown] = await Promise.all([
    Restaurant.countDocuments({ isActive: true }),
    ReviewLog.countDocuments(),
    Order.countDocuments(),
    Restaurant.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
  ]);

  let activePlans = 0;
  for (const p of planBreakdown) {
    if (p._id === 'basic' || p._id === 'pro') activePlans += p.count as number;
  }

  res.success({ totalRestaurants, totalReviews, totalOrders, activePlans, revenue: 0 });
});
