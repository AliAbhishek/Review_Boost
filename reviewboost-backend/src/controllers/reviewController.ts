import { Request, Response } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ReviewLog } from '../models/ReviewLog';
import { Customer } from '../models/Customer';
import { Voucher } from '../models/Voucher';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { generateReviews } from '../services/aiService';
import { sendPrivateReviewAlert } from '../services/emailService';
import { logger } from '../utils/logger';

export const generateReviewSchema = z.object({
  slug: z.string().min(1),
  stars: z.number().int().min(1).max(5),
});

export const logReviewSchema = z.object({
  slug:       z.string().min(1),
  stars:      z.number().int().min(1).max(5),
  reviewText: z.string().min(1).max(2000),
  wasEdited:  z.boolean().optional().default(false),
  token:      z.string().optional(),
});

/** Returns public-facing restaurant data for the review page (strips internal fields). */
export const getRestaurantPublic = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findOne(
    { slug: req.params.slug, isActive: true },
    { ownerEmail: 0, ownerPhone: 0, plan: 0, trialEndsAt: 0 },
  ).lean();

  if (!restaurant) throw new AppError('Restaurant not found', 404);

  res.success({ restaurant });
});

/** Calls Claude and returns 3 AI-generated review options. */
export const generateReviewOptions = asyncHandler(async (req: Request, res: Response) => {
  const { slug, stars } = req.body as z.infer<typeof generateReviewSchema>;

  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const reviews = await generateReviews(restaurant, stars);

  res.success({ reviews });
});

/**
 * Logs a submitted review applying smart routing:
 * - Stars 1–3 → always private (never surfaced publicly)
 * - Stars 4–5 → google, or zomato if the restaurant has a zomatoUrl
 */
export const logReview = asyncHandler(async (req: Request, res: Response) => {
  const { slug, stars, reviewText, wasEdited, token } = req.body as z.infer<typeof logReviewSchema>;

  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const customerIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
    req.socket.remoteAddress;

  const submittedTo: 'google' | 'zomato' | 'private' =
    stars <= 2
      ? 'private'
      : restaurant.zomatoUrl && Math.random() < 0.5
        ? 'zomato'
        : 'google';

  const reviewLog = await ReviewLog.create({
    restaurantId: restaurant._id,
    stars,
    reviewText,
    wasEdited,
    submittedTo,
    customerIp,
  });

  // Mark the customer as reviewed if they arrived via email campaign
  if (token) {
    Customer.findOneAndUpdate(
      { emailToken: token, restaurantId: restaurant._id },
      { reviewedAt: new Date() },
    ).catch((err) => logger.error(`Failed to mark customer reviewed: ${String(err)}`));
  }

  if (submittedTo === 'private') {
    sendPrivateReviewAlert(restaurant.ownerEmail, stars, reviewText).catch((err) =>
      logger.error(`Failed to send private review alert: ${String(err)}`),
    );
  }

  // Return active voucher so the frontend can show it on the thank-you screen
  const voucher = await Voucher.findOne({ restaurantId: restaurant._id, isActive: true }).lean();

  res.created({ reviewLog, voucher: voucher ?? null });
});
