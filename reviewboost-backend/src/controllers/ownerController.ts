import { Request, Response } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ReviewLog } from '../models/ReviewLog';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const getOwnerProfile = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.owner!.restaurantId).lean();
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  res.success(restaurant);
});

export const updateProfileSchema = z.object({
  name:          z.string().min(2).max(200).optional(),
  services:      z.array(z.string()).max(10).optional(),
  description:   z.string().max(500).optional(),
  cuisine:       z.string().max(100).optional(),
  city:          z.string().max(100).optional(),
  googleMapsUrl:   z.string().url().optional().or(z.literal('')),
  googleReviewUrl: z.string().url().optional().or(z.literal('')),
  zomatoUrl:       z.string().url().optional().or(z.literal('')),
  logoColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ownerPhone:    z.string().min(7).max(20).optional(),
});

export const getOwnerStats = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.owner!.restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [stats, thisMonth, lastMonth] = await Promise.all([
    ReviewLog.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          avgRating: { $avg: '$stars' },
          publicReviews: { $sum: { $cond: [{ $ne: ['$submittedTo', 'private'] }, 1, 0] } },
        },
      },
    ]),
    ReviewLog.countDocuments({ restaurantId: restaurant._id, timestamp: { $gte: thisMonthStart } }),
    ReviewLog.countDocuments({
      restaurantId: restaurant._id,
      timestamp: { $gte: lastMonthStart, $lt: thisMonthStart },
    }),
  ]);

  const s = stats[0] ?? { totalScans: 0, avgRating: 0, publicReviews: 0 };

  res.success({
    totalScans:     s.totalScans as number,
    reviewsGenerated: s.publicReviews as number,
    averageRating:  Number((s.avgRating as number).toFixed(1)),
    thisMonth,
    lastMonth,
  });
});

export const getOwnerReviews = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    ReviewLog.find({ restaurantId: req.owner!.restaurantId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewLog.countDocuments({ restaurantId: req.owner!.restaurantId }),
  ]);

  res.paginated(reviews, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const updateOwnerProfile = asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body as z.infer<typeof updateProfileSchema>;

  const restaurant = await Restaurant.findByIdAndUpdate(
    req.owner!.restaurantId,
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  res.success(restaurant);
});
