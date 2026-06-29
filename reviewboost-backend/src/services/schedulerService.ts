import cron from 'node-cron';
import crypto from 'crypto';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';
import { sendReviewRequestEmail } from './emailService';
import { logger } from '../utils/logger';

async function processFollowUpEmails() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const pending = await Customer.find({
    emailSentAt: { $exists: false },
    visitDate:   { $lte: threeHoursAgo },
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

      await sendReviewRequestEmail(customer.name, customer.email, restaurant.name, restaurant.slug, token);

      logger.info(`[Scheduler] Follow-up sent to ${customer.email} for "${restaurant.name}"`);
    } catch (err) {
      logger.error(`[Scheduler] Failed for customer ${customer._id}: ${String(err)}`);
    }
  }
}

export function startScheduler() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    processFollowUpEmails().catch((err) =>
      logger.error(`[Scheduler] Unhandled error: ${String(err)}`),
    );
  });

  // Also run immediately on startup to catch any missed sends
  processFollowUpEmails().catch((err) =>
    logger.error(`[Scheduler] Startup run failed: ${String(err)}`),
  );

  logger.info('[Scheduler] Email follow-up scheduler started (runs every 30 min)');
}
