import cron from 'node-cron';
import crypto from 'crypto';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';
import { sendReviewRequestEmail } from './emailService';
import { sendWA } from './whatsappService';
import { reviewRequestWA } from './whatsappMessages';
import { env } from '../config/env';
import { logger } from '../utils/logger';

async function processFollowUpEmails() {
  const delay = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const pending = await Customer.find({
    emailSentAt: { $exists: false },
    visitDate:   { $lte: delay },
  }).lean();

  if (pending.length === 0) return;

  logger.info(`[Scheduler] Processing ${pending.length} follow-up email(s)`);

  for (const customer of pending) {
    try {
      const restaurant = await Restaurant.findById(customer.restaurantId).lean();
      if (!restaurant || !restaurant.isActive) continue;

      const token = crypto.randomUUID();

      await Customer.findByIdAndUpdate(customer._id, {
        emailSentAt: new Date(),
        emailToken:  token,
      });

      const reviewUrl = `${env.FRONTEND_URL}/r/${restaurant.slug}?token=${token}`;
      sendReviewRequestEmail(customer.name, customer.email, restaurant.name, restaurant.slug, token, restaurant.logoUrl, restaurant.logoColor);
      sendWA(
        restaurant._id.toString(),
        customer.phone,
        reviewRequestWA(customer.name, restaurant.name, reviewUrl),
      );
      logger.info(`[Scheduler] Queued follow-up for ${customer.email} at "${restaurant.name}"`);
    } catch (err) {
      logger.error(`[Scheduler] Failed for customer ${customer._id}: ${String(err)}`);
    }
  }
}

export function startScheduler() {
  cron.schedule('*/30 * * * *', () => {
    processFollowUpEmails().catch((err) =>
      logger.error(`[Scheduler] Unhandled error: ${String(err)}`),
    );
  });

  // Also run immediately on startup to catch any missed sends
  processFollowUpEmails().catch((err) =>
    logger.error(`[Scheduler] Startup run failed: ${String(err)}`),
  );

  logger.info('[Scheduler] Email follow-up scheduler started (runs every 30 min, 3h delay)');
}
