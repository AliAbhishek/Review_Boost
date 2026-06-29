import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn(`[Email] SMTP not configured — would have sent "${payload.subject}" to ${payload.to}`);
    return;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    logger.info(`[Email] Sent "${payload.subject}" to ${payload.to}`);
  } catch (err) {
    logger.error(`[Email] Failed to send "${payload.subject}" to ${payload.to}`, { err });
    throw err;
  }
}

export async function sendOwnerInviteEmail(
  ownerEmail: string,
  restaurantName: string,
  restaurantId: string,
): Promise<void> {
  const inviteUrl = `${env.FRONTEND_URL}/register?restaurant=${restaurantId}`;

  await sendEmail({
    to: ownerEmail,
    subject: `You've been invited to manage ${restaurantName} on ReviewBoost`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">ReviewBoost ⚡</h1>
            </div>
            <div style="padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">You're invited!</h2>
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                Your restaurant <strong style="color: #111827;">${restaurantName}</strong> has been set up on ReviewBoost.
                Create your owner account to access your dashboard, get your QR code, and start collecting AI-powered reviews.
              </p>
              <a
                href="${inviteUrl}"
                style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;"
              >
                Create my account →
              </a>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; line-height: 1.6;">
                Or copy this link into your browser:<br />
                <span style="color: #6366f1; word-break: break-all;">${inviteUrl}</span>
              </p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This invite is for ${ownerEmail}. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendWelcomeEmail(
  ownerEmail: string,
  ownerName: string,
  restaurantName: string,
): Promise<void> {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;

  await sendEmail({
    to: ownerEmail,
    subject: `Welcome to ReviewBoost — ${restaurantName} is live!`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">ReviewBoost ⚡</h1>
            </div>
            <div style="padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">Welcome, ${ownerName}!</h2>
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                <strong style="color: #111827;">${restaurantName}</strong> is now live on ReviewBoost.
                Head to your dashboard to grab your QR code and start collecting reviews.
              </p>
              <a
                href="${dashboardUrl}"
                style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;"
              >
                Go to dashboard →
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendReviewRequestEmail(
  customerName: string,
  customerEmail: string,
  businessName: string,
  slug: string,
  token: string,
): Promise<void> {
  const reviewUrl = `${env.FRONTEND_URL}/r/${slug}?token=${token}`;
  const firstName = customerName.split(' ')[0];

  await sendEmail({
    to: customerEmail,
    subject: `How was your visit to ${businessName}?`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: #111827; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">ReviewBoost ⚡</h1>
            </div>
            <div style="padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">Hi ${firstName}, how was your visit?</h2>
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                Thanks for visiting <strong style="color: #111827;">${businessName}</strong>!
                We'd love to hear how your experience was — it only takes 30 seconds.
              </p>
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <p style="color: #374151; font-size: 14px; margin: 0 0 4px; font-weight: 600;">How it works</p>
                <ol style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Click the button below</li>
                  <li>Rate your experience (1–5 stars)</li>
                  <li>We'll draft a review — you just pick one</li>
                  <li>Paste it to Google in one tap</li>
                </ol>
              </div>
              <a
                href="${reviewUrl}"
                style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;"
              >
                Leave a review →
              </a>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; line-height: 1.6;">
                Or copy this link:<br />
                <span style="color: #6366f1; word-break: break-all;">${reviewUrl}</span>
              </p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                You're receiving this because you visited ${businessName}. Ignore if not interested.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPrivateReviewAlert(
  ownerEmail: string,
  stars: number,
  reviewText: string,
): Promise<void> {
  const starsLabel = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  await sendEmail({
    to: ownerEmail,
    subject: `ReviewBoost: New private feedback (${stars}★)`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: #111827; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">ReviewBoost ⚡</h1>
            </div>
            <div style="padding: 40px;">
              <h2 style="margin: 0 0 4px; color: #111827; font-size: 20px;">New private feedback</h2>
              <p style="color: #f59e0b; font-size: 22px; margin: 0 0 20px; letter-spacing: 2px;">${starsLabel}</p>
              <blockquote style="border-left: 4px solid #e5e7eb; margin: 0 0 24px; padding: 12px 20px; color: #374151; font-style: italic; line-height: 1.6; background: #f9fafb; border-radius: 0 8px 8px 0;">
                ${reviewText}
              </blockquote>
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                This review was kept private and was not posted to Google or Zomato.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
