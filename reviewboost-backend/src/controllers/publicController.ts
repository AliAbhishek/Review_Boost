import { Request, Response } from 'express';
import { z } from 'zod';
import { Restaurant, BUSINESS_TYPES } from '../models/Restaurant';
import { asyncHandler } from '../utils/asyncHandler';
import { generateUniqueSlug } from '../utils/slugify';
import { sendOwnerInviteEmail } from '../services/emailService';
import { logger } from '../utils/logger';

export const requestDemoSchema = z.object({
  businessName: z.string().min(2).max(200),
  email:        z.string().email(),
  businessType: z.enum(BUSINESS_TYPES),
});

export const requestDemo = asyncHandler(async (req: Request, res: Response) => {
  const { businessName, email, businessType } = req.body as z.infer<typeof requestDemoSchema>;

  const existing = await Restaurant.findOne({ ownerEmail: email.toLowerCase() });
  if (existing) {
    res.success({ message: 'An account already exists for this email. Check your inbox for your invite link.' });
    return;
  }

  const slug = await generateUniqueSlug(businessName);
  const restaurant = await Restaurant.create({
    name: businessName,
    businessType,
    ownerEmail: email,
    slug,
    plan: 'trial',
  });

  sendOwnerInviteEmail(email, businessName, restaurant._id.toString());

  res.created({ message: 'Invite sent! Check your email to finish setting up your account.' });
});
