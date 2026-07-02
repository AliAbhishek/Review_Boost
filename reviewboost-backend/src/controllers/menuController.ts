import { Request, Response } from 'express';
import { z } from 'zod';
import { MenuItem } from '../models/MenuItem';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendOfferEmail } from '../services/emailService';
import { sendWA } from '../services/whatsappService';
import { offerWA } from '../services/whatsappMessages';
import { logger } from '../utils/logger';

export const menuItemSchema = z.object({
  name:        z.string().min(1).max(100),
  category:    z.string().max(50).optional().default('Main'),
  price:       z.number().min(0),
  isAvailable: z.boolean().optional().default(true),
});

export const updateMenuItemSchema = menuItemSchema.partial();

export const listMenuItems = asyncHandler(async (req: Request, res: Response) => {
  const items = await MenuItem.find({ restaurantId: req.owner!.restaurantId })
    .sort({ category: 1, name: 1 })
    .lean();
  res.success({ items });
});

export const addMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof menuItemSchema>;
  const item = await MenuItem.create({ restaurantId: req.owner!.restaurantId, ...data });
  res.created({ item });
});

export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof updateMenuItemSchema>;
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.owner!.restaurantId },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!item) throw new AppError('Item not found', 404);
  res.success({ item });
});

export const bulkMenuSchema = z.object({ csv: z.string().min(1) });

export const bulkAddMenuItems = asyncHandler(async (req: Request, res: Response) => {
  const { csv } = req.body as z.infer<typeof bulkMenuSchema>;
  const restaurantId = req.owner!.restaurantId;

  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const docs: { restaurantId: typeof restaurantId; name: string; category: string; price: number }[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 2) { errors.push(`Skipped: "${line}" — expected Name, Price or Name, Category, Price`); continue; }

    // Support both: "Name, Price" and "Name, Category, Price"
    let name: string, category: string, priceStr: string;
    if (parts.length >= 3) {
      [name, category, priceStr] = parts;
    } else {
      [name, priceStr] = parts;
      category = 'Main';
    }

    const price = parseFloat(priceStr);
    if (!name || isNaN(price) || price < 0) { errors.push(`Skipped: "${line}" — invalid name or price`); continue; }

    docs.push({ restaurantId, name, category: category || 'Main', price });
  }

  const inserted = docs.length > 0 ? await MenuItem.insertMany(docs, { ordered: false }) : [];
  res.created({ inserted: inserted.length, errors });
});

// ─── Shared: broadcast offer emails to all restaurant customers ───────────────
async function broadcastOffers(
  restaurantId: unknown,
  offers: { name: string; category: string; originalPrice: number; discountedPrice: number; discountPercent: number }[],
) {
  const [customers, restaurant] = await Promise.all([
    Customer.find({ restaurantId, email: { $exists: true, $ne: '' } }).lean(),
    Restaurant.findById(restaurantId).lean(),
  ]);
  if (!restaurant || customers.length === 0) return;

  for (const customer of customers) {
    if (!customer.email) continue;
    sendOfferEmail(customer.name, customer.email, restaurant.name, restaurant.logoColor ?? '#6366f1', offers);
    sendWA(restaurantId as string, customer.phone, offerWA(customer.name, restaurant.name, offers));
  }
  logger.info(`[Offer] Queued ${customers.length} offer notification(s)`);
}

// ─── Offer schemas ────────────────────────────────────────────────────────────
export const applyOfferSchema = z.object({
  discountPercent: z.number().min(0).max(100),
});

export const bulkOfferSchema = z.object({
  itemIds:         z.array(z.string()).min(1),
  discountPercent: z.number().min(0).max(100),
});

// ─── Single item offer ────────────────────────────────────────────────────────
export const applyOffer = asyncHandler(async (req: Request, res: Response) => {
  const { discountPercent } = req.body as z.infer<typeof applyOfferSchema>;
  const restaurantId = req.owner!.restaurantId;

  const item = await MenuItem.findOne({ _id: req.params.id, restaurantId });
  if (!item) throw new AppError('Item not found', 404);

  if (discountPercent === 0) {
    // Remove offer — restore original price
    item.price           = item.originalPrice ?? item.price;
    item.originalPrice   = undefined;
    item.discountPercent = undefined;
  } else {
    const base           = item.originalPrice ?? item.price; // don't compound discounts
    item.originalPrice   = base;
    item.discountPercent = discountPercent;
    item.price           = Math.round(base * (1 - discountPercent / 100) * 100) / 100;
  }

  await item.save();

  if (discountPercent > 0) {
    broadcastOffers(restaurantId, [{
      name: item.name, category: item.category,
      originalPrice: item.originalPrice!, discountedPrice: item.price, discountPercent,
    }]);
  }

  res.success({ item });
});

// ─── Bulk offer ───────────────────────────────────────────────────────────────
export const bulkApplyOffer = asyncHandler(async (req: Request, res: Response) => {
  const { itemIds, discountPercent } = req.body as z.infer<typeof bulkOfferSchema>;
  const restaurantId = req.owner!.restaurantId;

  const items = await MenuItem.find({ _id: { $in: itemIds }, restaurantId });
  if (items.length === 0) throw new AppError('No matching items found', 404);

  const offerPayload: { name: string; category: string; originalPrice: number; discountedPrice: number; discountPercent: number }[] = [];

  for (const item of items) {
    if (discountPercent === 0) {
      item.price           = item.originalPrice ?? item.price;
      item.originalPrice   = undefined;
      item.discountPercent = undefined;
    } else {
      const base           = item.originalPrice ?? item.price;
      item.originalPrice   = base;
      item.discountPercent = discountPercent;
      item.price           = Math.round(base * (1 - discountPercent / 100) * 100) / 100;
      offerPayload.push({ name: item.name, category: item.category, originalPrice: base, discountedPrice: item.price, discountPercent });
    }
    await item.save();
  }

  if (offerPayload.length > 0) {
    broadcastOffers(restaurantId, offerPayload);
  }

  res.success({ updated: items.length });
});

export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await MenuItem.findOneAndDelete({
    _id: req.params.id,
    restaurantId: req.owner!.restaurantId,
  });
  if (!item) throw new AppError('Item not found', 404);
  res.success({ message: 'Item removed' });
});
