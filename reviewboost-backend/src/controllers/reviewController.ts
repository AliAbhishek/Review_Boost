import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Restaurant } from '../models/Restaurant';
import { ReviewLog } from '../models/ReviewLog';
import { Customer, type ICustomerDocument } from '../models/Customer';
import { Bill } from '../models/Bill';
import { Voucher } from '../models/Voucher';
import { VoucherRedemption } from '../models/VoucherRedemption';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { generateReviews } from '../services/aiService';
import { sendPrivateReviewAlert, sendVoucherEmail } from '../services/emailService';
import { sendWA } from '../services/whatsappService';
import { voucherWA } from '../services/whatsappMessages';
import { logger } from '../utils/logger';

export const generateReviewSchema = z.object({
  slug:  z.string().min(1),
  stars: z.number().int().min(1).max(5),
  token: z.string().optional(),
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
  const { slug, stars, token } = req.body as z.infer<typeof generateReviewSchema>;

  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  // If the customer arrived via email link, use what the owner recorded they ordered
  let orderedItems: string | undefined;
  if (token) {
    const customer = await Customer.findOne({ emailToken: token, restaurantId: restaurant._id }).lean();
    orderedItems = customer?.orderedItems ?? undefined;
  }

  const reviews = await generateReviews(restaurant, stars, orderedItems);

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
    stars <= 2 ? 'private' : 'google';

  const reviewLog = await ReviewLog.create({
    restaurantId: restaurant._id,
    stars,
    reviewText,
    wasEdited,
    submittedTo,
    customerIp,
  });

  // Mark the customer as reviewed + mark the specific bill reviewed via token
  let customer: ICustomerDocument | null = null;
  if (token) {
    const now = new Date();
    [customer] = await Promise.all([
      Customer.findOneAndUpdate(
        { emailToken: token, restaurantId: restaurant._id },
        { reviewedAt: now },
        { new: true },
      ),
      Bill.findOneAndUpdate(
        { emailToken: token, restaurantId: restaurant._id },
        { reviewedAt: now },
      ),
    ]);
  }

  if (submittedTo === 'private') {
    sendPrivateReviewAlert(restaurant.ownerEmail, stars, reviewText);
  }

  // Issue a personalized voucher redemption if restaurant has an active voucher
  const voucher = await Voucher.findOne({ restaurantId: restaurant._id, isActive: true }).lean();
  let redemption = null;

  if (voucher && customer?.email) {
    // Generate a unique per-customer code: BASE_CODE-XXXX
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code   = `${voucher.code}-${suffix}`;
    const expiresAt = new Date(Date.now() + voucher.expiryDays * 24 * 60 * 60 * 1000);

    try {
      redemption = await VoucherRedemption.create({
        restaurantId:    restaurant._id,
        voucherId:       voucher._id,
        customerId:      customer._id,
        customerName:    customer.name,
        customerEmail:   customer.email,
        code,
        discountPercent: voucher.discountPercent,
        status:          'earned',
        earnedAt:        new Date(),
        expiresAt,
      });

      sendVoucherEmail(
        customer.name,
        customer.email,
        restaurant.name,
        restaurant.logoColor ?? '#6366f1',
        code,
        voucher.discountPercent,
        voucher.discountText,
        voucher.description,
        expiresAt,
      );

      sendWA(
        restaurant._id.toString(),
        customer.phone,
        voucherWA(customer.name, restaurant.name, code, voucher.discountPercent, voucher.discountText, expiresAt),
      );

      logger.info(`[Voucher] Issued ${code} to ${customer.email}`);
    } catch (err) {
      logger.error(`[Voucher] Failed to issue for ${customer.email}: ${String(err)}`);
    }
  }

  res.created({ reviewLog, voucher: voucher ?? null, redemptionCode: redemption?.code ?? null });
});
