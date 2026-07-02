import { env } from '../config/env';
import { enqueueEmail, type EmailPayload } from './emailQueue';

// Re-export so existing imports of EmailPayload from emailService still work.
export type { EmailPayload };

export function sendOfferEmail(
  customerName: string,
  customerEmail: string,
  restaurantName: string,
  logoColor: string,
  offers: { name: string; category: string; originalPrice: number; discountedPrice: number; discountPercent: number }[],
): void {
  const accent = logoColor || '#6366f1';
  const rows = offers.map((o) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:700;color:#111827;font-size:15px;">${o.name}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${o.category}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap;">
        <span style="text-decoration:line-through;color:#9ca3af;font-size:13px;">₹${o.originalPrice.toFixed(0)}</span>
        &nbsp;
        <span style="font-weight:900;color:${accent};font-size:17px;">₹${o.discountedPrice.toFixed(0)}</span>
        <div style="display:inline-block;background:${accent}18;color:${accent};font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;margin-top:4px;">${o.discountPercent}% OFF</div>
      </td>
    </tr>`).join('');

  enqueueEmail({
    to: customerEmail,
    subject: `🎉 Special Offer from ${restaurantName} — Don't miss out!`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:36px 40px 28px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Exclusive Offer</p>
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;">${restaurantName}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Special prices just for you, ${customerName.split(' ')[0]}!</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#374151;margin:0 0 20px;line-height:1.6;font-size:15px;">We're excited to share exclusive discounts. Visit us soon to avail them!</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:28px;background:#f9fafb;border-radius:12px;padding:16px 20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#6b7280;">Show this email at the counter to confirm your offer price.</p>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendOwnerInviteEmail(
  ownerEmail: string,
  restaurantName: string,
  restaurantId: string,
): void {
  const inviteUrl = `${env.FRONTEND_URL}/register?restaurant=${restaurantId}`;
  enqueueEmail({
    to: ownerEmail,
    subject: `You've been invited to manage ${restaurantName} on ReviewBoost`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">ReviewBoost ⚡</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">You're invited!</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Your restaurant <strong style="color:#111827;">${restaurantName}</strong> has been set up on ReviewBoost. Create your owner account to start collecting reviews.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Create my account →</a>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;line-height:1.6;">Or copy: <span style="color:#6366f1;word-break:break-all;">${inviteUrl}</span></p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;">This invite is for ${ownerEmail}. Ignore if unexpected.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendWelcomeEmail(
  ownerEmail: string,
  ownerName: string,
  restaurantName: string,
): void {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;
  enqueueEmail({
    to: ownerEmail,
    subject: `Welcome to ReviewBoost — ${restaurantName} is live!`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">ReviewBoost ⚡</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Welcome, ${ownerName}!</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;"><strong style="color:#111827;">${restaurantName}</strong> is now live on ReviewBoost. Grab your QR code and start collecting reviews.</p>
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Go to dashboard →</a>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendReviewRequestEmail(
  customerName: string,
  customerEmail: string,
  businessName: string,
  slug: string,
  token: string,
): void {
  const reviewUrl = `${env.FRONTEND_URL}/r/${slug}?token=${token}`;
  const firstName = customerName.split(' ')[0];
  enqueueEmail({
    to: customerEmail,
    subject: `How was your visit to ${businessName}?`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">ReviewBoost ⚡</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Hi ${firstName}, how was your visit?</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Thanks for visiting <strong style="color:#111827;">${businessName}</strong>! We'd love to hear about your experience — it only takes 30 seconds.</p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:28px;">
        <p style="color:#374151;font-size:14px;margin:0 0 4px;font-weight:600;">How it works</p>
        <ol style="color:#6b7280;font-size:14px;margin:0;padding-left:20px;line-height:1.8;">
          <li>Click the button below</li>
          <li>Rate your experience (1–5 stars)</li>
          <li>We'll draft a review — you just pick one</li>
          <li>Paste it to Google in one tap</li>
        </ol>
      </div>
      <a href="${reviewUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Leave a review →</a>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;line-height:1.6;">Or copy: <span style="color:#6366f1;word-break:break-all;">${reviewUrl}</span></p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;">You're receiving this because you visited ${businessName}. Ignore if not interested.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendReceiptEmail(
  customerName: string,
  customerEmail: string,
  businessName: string,
  receiptNumber: string,
  items: { name: string; price: number; quantity: number; subtotal: number }[],
  subtotal: number,
  taxLines: { label: string; rate: number; amount: number }[],
  totalTax: number,
  grandTotal: number,
  logoColor: string,
  voucherApplied?: { code: string; discountPercent: number; discountAmount: number; customerName: string } | null,
  voucherTeaser?: { title: string; discountPercent: number } | null,
  reviewSlug?: string,
  reviewToken?: string,
): void {
  const accent = logoColor || '#6366f1';
  const f = (n: number) => `₹${n.toFixed(2)}`;
  const itemRows = items.map((i) => `
    <tr>
      <td style="padding:8px 0;color:#374151;font-size:14px;">${i.name}</td>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 0;color:#374151;font-size:14px;text-align:right;">${f(i.subtotal)}</td>
    </tr>`).join('');
  const taxRows = taxLines.map((t) => `
    <tr>
      <td colspan="2" style="padding:4px 0;color:#6b7280;font-size:13px;">${t.label}</td>
      <td style="padding:4px 0;color:#6b7280;font-size:13px;text-align:right;">${f(t.amount)}</td>
    </tr>`).join('');

  const voucherAppliedRow = voucherApplied
    ? `<tr>
        <td colspan="2" style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;">Voucher ${voucherApplied.code} (${voucherApplied.discountPercent}% off)</td>
        <td style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;text-align:right;">-${f(voucherApplied.discountAmount)}</td>
      </tr>`
    : '';

  const voucherTeaserBlock = voucherTeaser && !voucherApplied
    ? `<div style="margin-top:20px;background:linear-gradient(135deg,${accent}10,${accent}18);border:1px solid ${accent}30;border-radius:12px;padding:16px 20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${accent};">🎁 Unlock a reward on your next visit!</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">Review your experience to earn <strong>${voucherTeaser.discountPercent}% OFF</strong> — ${voucherTeaser.title}</p>
      </div>`
    : '';

  const reviewUrl = reviewSlug && reviewToken
    ? `${env.FRONTEND_URL}/r/${reviewSlug}?token=${reviewToken}`
    : null;

  const reviewBlock = reviewUrl
    ? `<div style="margin-top:24px;text-align:center;padding:20px 0;border-top:1px solid #f3f4f6;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">Enjoyed your visit?</p>
        <p style="margin:0 0 16px;font-size:12px;color:#6b7280;">A quick review means the world to us — it takes 30 seconds!</p>
        <a href="${reviewUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Leave a Review →</a>
      </div>`
    : '';

  enqueueEmail({
    to: customerEmail,
    subject: `Your receipt from ${businessName} — ${receiptNumber}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${accent};padding:28px 36px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;">${businessName}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Receipt ${receiptNumber}</p>
    </div>
    <div style="padding:32px 36px;">
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hi ${customerName.split(' ')[0]}, thank you for visiting!</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #f3f4f6;">
            <th style="text-align:left;padding-bottom:8px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;">Item</th>
            <th style="text-align:center;padding-bottom:8px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;">Qty</th>
            <th style="text-align:right;padding-bottom:8px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr><td colspan="3" style="padding:4px 0;border-top:1px solid #f3f4f6;"></td></tr>
          <tr>
            <td colspan="2" style="padding:8px 0;color:#6b7280;font-size:13px;">Subtotal</td>
            <td style="padding:8px 0;color:#374151;font-size:14px;text-align:right;">${f(subtotal)}</td>
          </tr>
          ${taxRows}
          ${voucherAppliedRow}
          <tr style="border-top:2px solid #111827;">
            <td colspan="2" style="padding:12px 0 0;color:#111827;font-size:16px;font-weight:800;">Total</td>
            <td style="padding:12px 0 0;color:#111827;font-size:16px;font-weight:800;text-align:right;">${f(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
      ${voucherTeaserBlock}
      ${reviewBlock}
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;text-align:center;">Thank you — see you again soon!</p>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendVoucherEmail(
  customerName: string,
  customerEmail: string,
  restaurantName: string,
  logoColor: string,
  voucherCode: string,
  discountPercent: number,
  discountText: string,
  description: string,
  expiresAt: Date,
): void {
  const accent  = logoColor || '#6366f1';
  const expiry  = expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = customerName.split(' ')[0];

  enqueueEmail({
    to: customerEmail,
    subject: `🎁 Your voucher from ${restaurantName} — Thank you for your review!`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:36px 40px 28px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Thank You!</p>
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;">${restaurantName}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">You've earned a reward, ${firstName}!</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#374151;margin:0 0 24px;line-height:1.6;font-size:15px;">
        Thank you for taking the time to share your experience. Here's a special reward for your next visit!
      </p>
      <!-- Voucher card -->
      <div style="border:2px dashed ${accent};border-radius:16px;padding:28px 24px;text-align:center;background:#fafafa;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your Exclusive Voucher</p>
        <p style="margin:8px 0;font-size:36px;font-weight:900;color:${accent};letter-spacing:4px;">${discountText}</p>
        <div style="background:${accent};color:#fff;font-size:22px;font-weight:900;letter-spacing:6px;padding:14px 28px;border-radius:12px;display:inline-block;margin:12px 0;">${voucherCode}</div>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">${description}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Valid until <strong>${expiry}</strong></p>
      </div>
      <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
          Simply show this email or mention the code <strong style="color:${accent};">${voucherCode}</strong> when placing your next order. The discount will be applied automatically.
        </p>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendPrivateReviewAlert(
  ownerEmail: string,
  stars: number,
  reviewText: string,
): void {
  const starsLabel = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  enqueueEmail({
    to: ownerEmail,
    subject: `ReviewBoost: New private feedback (${stars}★)`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">ReviewBoost ⚡</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 4px;color:#111827;font-size:20px;">New private feedback</h2>
      <p style="color:#f59e0b;font-size:22px;margin:0 0 20px;letter-spacing:2px;">${starsLabel}</p>
      <blockquote style="border-left:4px solid #e5e7eb;margin:0 0 24px;padding:12px 20px;color:#374151;font-style:italic;line-height:1.6;background:#f9fafb;border-radius:0 8px 8px 0;">${reviewText}</blockquote>
      <p style="color:#9ca3af;font-size:13px;margin:0;">This review was kept private and was not posted publicly.</p>
    </div>
  </div>
</body>
</html>`,
  }, 2); // 2 retries only for owner alerts — less critical
}
