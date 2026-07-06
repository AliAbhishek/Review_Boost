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

  logger.info(`[EmailQueue] SMTP config: host=${env.SMTP_HOST} port=${env.SMTP_PORT} user=${env.SMTP_USER} from="${env.SMTP_FROM}"`);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  try {
    await transporter.verify();
    logger.info(`[EmailQueue] SMTP connection verified OK`);
  } catch (verifyErr) {
    const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
    logger.error(`[EmailQueue] SMTP verify failed: ${msg}`)
    throw verifyErr
  }

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
    const errMsg = err instanceof Error ? err.message : String(err)
    const errCode = (err as { code?: string; responseCode?: number; response?: string }).code
    const errResponse = (err as { response?: string }).response
    if (job.attempt < job.maxAttempts) {
      const delay = BASE_DELAY_MS * Math.pow(2, job.attempt - 1);
      logger.warn(`[EmailQueue] Attempt ${job.attempt}/${job.maxAttempts} failed for ${job.payload.to}. Error: ${errMsg}${errCode ? ` (code: ${errCode})` : ''}${errResponse ? ` | SMTP response: ${errResponse}` : ''}. Retry in ${delay}ms`);
      setTimeout(() => { queue.push({ ...job, attempt: job.attempt + 1 }); drain(); }, delay);
    } else {
      logger.error(`[EmailQueue] Permanently failed "${job.payload.subject}" → ${job.payload.to} after ${job.maxAttempts} attempts. Final error: ${errMsg}${errCode ? ` (code: ${errCode})` : ''}${errResponse ? ` | SMTP response: ${errResponse}` : ''}`);
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
