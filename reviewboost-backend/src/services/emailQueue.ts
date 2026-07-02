import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Transport (raw SMTP — only called by the queue worker) ──────────────────
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function deliver(payload: EmailPayload): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn(`[EmailQueue] SMTP not configured — skipping "${payload.subject}" → ${payload.to}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({ from: env.SMTP_FROM, ...payload });
}

// ─── Queue ───────────────────────────────────────────────────────────────────
interface QueueJob {
  payload: EmailPayload;
  attempt: number;
  maxAttempts: number;
}

const queue: QueueJob[] = [];
let activeWorkers = 0;

const MAX_CONCURRENCY = 3;    // simultaneous SMTP connections
const BASE_DELAY_MS   = 2_000; // retry: 2s → 4s → 8s

async function processJob(job: QueueJob): Promise<void> {
  try {
    await deliver(job.payload);
    logger.info(`[EmailQueue] Delivered "${job.payload.subject}" → ${job.payload.to} (attempt ${job.attempt})`);
  } catch (err) {
    if (job.attempt < job.maxAttempts) {
      const delay = BASE_DELAY_MS * Math.pow(2, job.attempt - 1);
      logger.warn(`[EmailQueue] Attempt ${job.attempt}/${job.maxAttempts} failed for ${job.payload.to}. Retry in ${delay}ms`);
      setTimeout(() => { queue.push({ ...job, attempt: job.attempt + 1 }); drain(); }, delay);
    } else {
      logger.error(`[EmailQueue] Permanently failed "${job.payload.subject}" → ${job.payload.to} after ${job.maxAttempts} attempts`);
    }
  }
}

function drain(): void {
  while (queue.length > 0 && activeWorkers < MAX_CONCURRENCY) {
    const job = queue.shift()!;
    activeWorkers++;
    processJob(job).finally(() => { activeWorkers--; drain(); });
  }
}

export function enqueueEmail(payload: EmailPayload, maxAttempts = 3): void {
  queue.push({ payload, attempt: 1, maxAttempts });
  logger.debug(`[EmailQueue] Queued "${payload.subject}" → ${payload.to} (depth: ${queue.length + activeWorkers})`);
  drain();
}

export function getQueueStats(): { pending: number; active: number } {
  return { pending: queue.length, active: activeWorkers };
}
