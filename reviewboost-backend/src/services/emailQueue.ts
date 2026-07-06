import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Delivery via Resend HTTP API (no SMTP socket needed) ────────────────────
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function deliver(payload: EmailPayload): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  if (!env.RESEND_API_KEY) {
    logger.warn(`[EmailQueue] RESEND_API_KEY not set — skipping "${payload.subject}" → ${payload.to}`);
    return;
  }

  logger.info(`[EmailQueue] Sending via Resend: from="${env.SMTP_FROM}" to=${payload.to}`);

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    logger.error(`[EmailQueue] Resend API error: ${JSON.stringify(error)}`);
    throw new Error(error.message);
  }

  logger.info(`[EmailQueue] Resend accepted: id=${data?.id}`);
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
