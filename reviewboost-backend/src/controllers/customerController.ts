import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Customer } from '../models/Customer';
import { Bill } from '../models/Bill';

import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendReviewRequestEmail } from '../services/emailService';
import { sendWA } from '../services/whatsappService';
import { reviewRequestWA } from '../services/whatsappMessages';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const addCustomerSchema = z.object({
  name:         z.string().min(1).max(100),
  email:        z.string().email(),
  phone:        z.string().optional(),
  visitDate:    z.string().datetime().or(z.string().date()),
  orderedItems: z.string().max(300).optional(),
  notes:        z.string().max(300).optional(),
});

export const bulkAddSchema = z.object({
  // Each entry: "Name, email@example.com" — one per line
  csv: z.string().min(1),
});

export const addCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof addCustomerSchema>;
  const restaurantId = req.owner!.restaurantId;

  // Upsert by email — one record per customer per restaurant
  const customer = await Customer.findOneAndUpdate(
    { restaurantId, email: data.email },
    {
      $set: {
        name:         data.name,
        phone:        data.phone,
        visitDate:    new Date(data.visitDate),
        orderedItems: data.orderedItems,
        notes:        data.notes,
      },
      $unset: { emailSentAt: '' },   // reset so scheduler re-sends for the new visit
      $setOnInsert: { restaurantId },
    },
    { upsert: true, new: true },
  );

  res.created({ customer });
});

export const bulkAddCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { csv } = req.body as z.infer<typeof bulkAddSchema>;
  const restaurantId = req.owner!.restaurantId;

  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  let upserted = 0;

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 2) { errors.push(`Skipped: "${line}" — expected "Name, email" or "Name, email, phone"`); continue; }
    const [name, email, phone] = parts;
    if (!email.includes('@')) { errors.push(`Skipped: invalid email "${email}"`); continue; }
    try {
      await Customer.findOneAndUpdate(
        { restaurantId, email },
        {
          $set:    { name, ...(phone ? { phone } : {}), visitDate: new Date() },
          $unset:  { emailSentAt: '' },
          $setOnInsert: { restaurantId },
        },
        { upsert: true },
      );
      upserted++;
    } catch (err) {
      errors.push(`Failed: "${email}" — ${String(err)}`);
    }
  }

  res.created({ inserted: upserted, errors });
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const skip  = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find({ restaurantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments({ restaurantId }),
  ]);

  res.paginated(customers, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, restaurantId });
  if (!customer) throw new AppError('Customer not found', 404);
  res.success({ message: 'Customer removed' });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const customer = await Customer.findOne({ _id: req.params.id, restaurantId }).lean();
  if (!customer) throw new AppError('Customer not found', 404);

  const bills = await Bill.find({ restaurantId, 'customer.email': customer.email })
    .sort({ createdAt: -1 })
    .lean();

  res.success({ customer, bills });
});

export const sendReviewForBill = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const { billId } = req.body as { billId?: string };

  const customer = await Customer.findOne({ _id: req.params.id, restaurantId });
  if (!customer) throw new AppError('Customer not found', 404);

  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  let orderedItems = customer.orderedItems;
  if (billId) {
    const bill = await Bill.findOne({ _id: billId, restaurantId }).lean();
    if (bill) orderedItems = bill.items.map((i) => i.name).join(', ');
  }

  const token = crypto.randomBytes(32).toString('hex');

  await Promise.all([
    Customer.findByIdAndUpdate(customer._id, {
      emailSentAt:  new Date(),
      emailToken:   token,
      orderedItems: orderedItems || customer.orderedItems,
    }),
    // Stamp the token on the specific bill so we can mark it reviewed later
    billId
      ? Bill.findOneAndUpdate({ _id: billId, restaurantId }, { emailToken: token })
      : Promise.resolve(null),
  ]);

  const reviewUrl = `${env.FRONTEND_URL}/r/${restaurant.slug}?token=${token}`;
  sendReviewRequestEmail(customer.name, customer.email, restaurant.name, restaurant.slug, token);
  sendWA(restaurantId.toString(), customer.phone, reviewRequestWA(customer.name, restaurant.name, reviewUrl));
  logger.info(`[Manual] Review email+WA queued for ${customer.email} (bill ${billId ?? 'latest'})`);

  res.success({ message: 'Review email sent' });
});

// Called by the scheduler — not an HTTP endpoint
export async function getPendingEmailCustomers() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  return Customer.find({
    emailSentAt: { $exists: false },
    visitDate:   { $lte: threeHoursAgo },
  })
    .populate('restaurantId')
    .lean();
}
