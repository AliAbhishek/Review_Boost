import { Request, Response } from 'express';
import { z } from 'zod';
import { Voucher } from '../models/Voucher';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const upsertVoucherSchema = z.object({
  isActive:     z.boolean().default(true),
  title:        z.string().min(1).max(100),
  discountText: z.string().min(1).max(50),
  description:  z.string().max(200).optional(),
  code:         z.string().min(1).max(30).toUpperCase(),
  expiryDays:   z.number().int().min(1).max(365).default(30),
});

export const getVoucher = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const voucher = await Voucher.findOne({ restaurantId }).lean();
  res.success({ voucher: voucher ?? null });
});

export const upsertVoucher = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const data = req.body as z.infer<typeof upsertVoucherSchema>;

  const voucher = await Voucher.findOneAndUpdate(
    { restaurantId },
    { ...data, restaurantId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  res.success({ voucher });
});

export const deleteVoucher = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  await Voucher.findOneAndDelete({ restaurantId });
  res.noContent();
});
