import { env } from '../config/env';
import { enqueueEmail, type EmailPayload } from './emailQueue';

// Re-export so existing imports of EmailPayload from emailService still work.
export type { EmailPayload };

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Renders either the uploaded logo <img> or a letter-avatar div (email-safe, no flex). */
function logoAvatar(logoUrl: string | undefined | null, name: string, sizePx = 56): string {
  if (logoUrl) {
    return `<img src="${logoUrl}" alt="${name}" width="${sizePx}" height="${sizePx}"
      style="width:${sizePx}px;height:${sizePx}px;border-radius:${Math.round(sizePx * 0.25)}px;object-fit:cover;display:block;border:0;" />`;
  }
  return `<div style="width:${sizePx}px;height:${sizePx}px;background:rgba(255,255,255,0.22);border-radius:${Math.round(sizePx * 0.25)}px;text-align:center;line-height:${sizePx}px;">
    <span style="color:#fff;font-size:${Math.round(sizePx * 0.42)}px;font-weight:900;">${name.charAt(0).toUpperCase()}</span>
  </div>`;
}

// ─── Customer-facing emails ───────────────────────────────────────────────────

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
  logoUrl?: string | null,
  upiQrDataUrl?: string | null,
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
      <td colspan="2" style="padding:3px 0;color:#9ca3af;font-size:13px;">${t.label}</td>
      <td style="padding:3px 0;color:#6b7280;font-size:13px;text-align:right;">${f(t.amount)}</td>
    </tr>`).join('');

  const voucherAppliedRow = voucherApplied
    ? `<tr>
        <td colspan="2" style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;">Voucher ${voucherApplied.code} (${voucherApplied.discountPercent}% off)</td>
        <td style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;text-align:right;">-${f(voucherApplied.discountAmount)}</td>
      </tr>`
    : '';

  const voucherTeaserBlock = voucherTeaser && !voucherApplied
    ? `<div style="margin-top:20px;background:${accent}12;border:1px solid ${accent}30;border-radius:12px;padding:16px 20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${accent};">🎁 Unlock a reward on your next visit!</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">Review your experience to earn <strong>${voucherTeaser.discountPercent}% OFF</strong> — ${voucherTeaser.title}</p>
      </div>`
    : '';

  const reviewUrl = reviewSlug && reviewToken
    ? `${env.FRONTEND_URL}/r/${reviewSlug}?token=${reviewToken}`
    : null;

  enqueueEmail({
    to: customerEmail,
    subject: `Your receipt from ${businessName} — ${receiptNumber}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px 40px;">
<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">

  <!-- Header -->
  <div style="background:${accent};padding:28px 32px 24px;">
    <table style="border-collapse:collapse;width:100%;">
      <tr>
        <td style="width:64px;vertical-align:middle;">${logoAvatar(logoUrl, businessName, 56)}</td>
        <td style="vertical-align:middle;padding-left:14px;">
          <div style="color:#fff;font-size:20px;font-weight:900;line-height:1.2;">${businessName}</div>
          <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Receipt ${receiptNumber}</div>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">Hi ${customerName.split(' ')[0]}, thank you for visiting! 🙏</p>
  </div>

  <!-- Receipt table -->
  <div style="padding:28px 32px 0;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #f3f4f6;">
          <th style="text-align:left;padding-bottom:10px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:55%;">Item</th>
          <th style="text-align:center;padding-bottom:10px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:15%;">Qty</th>
          <th style="text-align:right;padding-bottom:10px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:30%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr><td colspan="3" style="padding:6px 0;border-top:1px solid #f3f4f6;"></td></tr>
        <tr>
          <td colspan="2" style="padding:4px 0;color:#9ca3af;font-size:13px;">Subtotal</td>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;text-align:right;">${f(subtotal)}</td>
        </tr>
        ${taxRows}
        ${voucherAppliedRow}
        <tr style="border-top:2px solid #111827;">
          <td colspan="2" style="padding:14px 0 0;color:#111827;font-size:17px;font-weight:900;">Total</td>
          <td style="padding:14px 0 0;color:${accent};font-size:20px;font-weight:900;text-align:right;">${f(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${voucherTeaserBlock ? `<div style="padding:0 32px;">${voucherTeaserBlock}</div>` : ''}

  ${reviewUrl ? `
  <div style="margin:24px 32px;background:${accent}0d;border:1px solid ${accent}28;border-radius:18px;padding:24px;text-align:center;">
    <div style="font-size:26px;margin-bottom:8px;">⭐</div>
    <div style="color:#111827;font-size:16px;font-weight:800;margin-bottom:6px;">Enjoyed your meal?</div>
    <p style="margin:0 0 18px;color:#6b7280;font-size:13px;line-height:1.6;">A quick review takes 30 seconds and means the world to our team.</p>
    <a href="${reviewUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px;">Leave a Review →</a>
  </div>` : ''}

  ${upiQrDataUrl ? `
  <!-- UPI Payment -->
  <div style="margin:0 32px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:18px;padding:20px;text-align:center;">
    <div style="color:#166534;font-size:14px;font-weight:800;margin-bottom:10px;">📱 Pay via UPI</div>
    <img src="${upiQrDataUrl}" alt="UPI QR Code" width="160" height="160"
      style="width:160px;height:160px;display:inline-block;border:0;border-radius:8px;" />
    <p style="margin:8px 0 0;color:#16a34a;font-size:12px;">Scan to pay ₹${grandTotal.toFixed(2)}</p>
  </div>` : ''}

  <!-- Footer -->
  <div style="padding:18px 32px 24px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="margin:0 0 5px;color:#9ca3af;font-size:13px;">See you again soon! 👋</p>
    <p style="margin:0;font-size:11px;color:#d1d5db;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
  </div>
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
  logoUrl?: string | null,
  logoColor?: string | null,
): void {
  const reviewUrl = `${env.FRONTEND_URL}/r/${slug}?token=${token}`;
  const firstName = customerName.split(' ')[0];
  const accent    = logoColor || '#6366f1';

  enqueueEmail({
    to: customerEmail,
    subject: `${firstName}, how was your visit to ${businessName}? ⭐`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px 40px;">
<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:36px 40px 28px;text-align:center;">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="${businessName}" width="64" height="64"
          style="width:64px;height:64px;border-radius:18px;object-fit:cover;display:inline-block;margin-bottom:16px;border:3px solid rgba(255,255,255,0.25);" />`
      : `<div style="width:64px;height:64px;background:${accent};border-radius:18px;text-align:center;line-height:64px;display:inline-block;margin-bottom:16px;">
          <span style="color:#fff;font-size:26px;font-weight:900;">${businessName.charAt(0).toUpperCase()}</span>
        </div>`
    }
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">${businessName}</h1>
    <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Thanks for visiting us, ${firstName}!</p>
    <div style="margin-top:24px;font-size:28px;letter-spacing:4px;">⭐⭐⭐⭐⭐</div>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px;">
    <h2 style="margin:0 0 10px;color:#111827;font-size:19px;font-weight:800;">How was your experience?</h2>
    <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.65;">
      Your honest feedback helps <strong style="color:#374151;">${businessName}</strong> improve — and helps other diners find a great meal.
    </p>

    <!-- Steps (table-based, works in all email clients) -->
    <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #f3f4f6;border-radius:16px;margin-bottom:28px;">
      ${[
        ['1', 'Tap the button below'],
        ['2', 'Pick 1–5 stars for your visit'],
        ['3', 'Choose from 3 AI-drafted reviews'],
        ['4', 'Paste it on Google — one tap'],
      ].map(([n, txt], i, arr) => `
      <tr>
        <td style="width:44px;padding:12px 0 12px 16px;vertical-align:middle;${i < arr.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
          <div style="width:26px;height:26px;background:#6366f1;border-radius:50%;text-align:center;line-height:26px;">
            <span style="color:#fff;font-size:11px;font-weight:800;">${n}</span>
          </div>
        </td>
        <td style="padding:12px 16px 12px 10px;color:#374151;font-size:14px;vertical-align:middle;${i < arr.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">${txt}</td>
      </tr>`).join('')}
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${reviewUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 38px;border-radius:14px;">
        Rate my experience →
      </a>
      <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;">Or copy: <a href="${reviewUrl}" style="color:#6366f1;word-break:break-all;">${reviewUrl}</a></p>
    </div>

    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 18px;">
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      You're getting this because you visited ${businessName}. Not interested? Simply ignore this email.
    </p>
  </div>
</div>
<p style="text-align:center;margin:20px 0 0;font-size:12px;color:#9ca3af;">
  Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong>
</p>
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
  logoUrl?: string | null,
): void {
  const accent    = logoColor || '#6366f1';
  const expiry    = expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = customerName.split(' ')[0];

  enqueueEmail({
    to: customerEmail,
    subject: `🎁 Your voucher from ${restaurantName} — Thank you for your review!`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px 40px;">
<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:32px 36px 24px;text-align:center;">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="${restaurantName}" width="60" height="60"
          style="width:60px;height:60px;border-radius:16px;object-fit:cover;display:inline-block;margin-bottom:14px;border:3px solid rgba(255,255,255,0.3);" />`
      : `<div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:16px;text-align:center;line-height:60px;display:inline-block;margin-bottom:14px;">
          <span style="color:#fff;font-size:26px;font-weight:900;">${restaurantName.charAt(0).toUpperCase()}</span>
        </div>`
    }
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Thank You!</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;">${restaurantName}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">You've earned a reward, ${firstName}!</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 36px;">
    <p style="color:#374151;margin:0 0 24px;line-height:1.6;font-size:14px;">
      Thank you for taking the time to share your experience. Here's a special reward for your next visit!
    </p>

    <!-- Voucher card -->
    <div style="border:2px dashed ${accent};border-radius:16px;padding:24px;text-align:center;background:#fafafa;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your Exclusive Voucher</p>
      <p style="margin:8px 0;font-size:32px;font-weight:900;color:${accent};letter-spacing:3px;">${discountText}</p>
      <div style="background:${accent};color:#fff;font-size:20px;font-weight:900;letter-spacing:5px;padding:12px 24px;border-radius:12px;display:inline-block;margin:10px 0;">${voucherCode}</div>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">${description}</p>
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Valid until <strong>${expiry}</strong></p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        Show this email or mention the code <strong style="color:${accent};">${voucherCode}</strong> when placing your next order. The discount will be applied automatically.
      </p>
    </div>
  </div>

  <div style="padding:16px 36px 24px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:11px;color:#d1d5db;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
  </div>
</div>
</div>
</body>
</html>`,
  });
}

export function sendOfferEmail(
  customerName: string,
  customerEmail: string,
  restaurantName: string,
  logoColor: string,
  offers: { name: string; category: string; originalPrice: number; discountedPrice: number; discountPercent: number }[],
  logoUrl?: string | null,
): void {
  const accent = logoColor || '#6366f1';
  const rows = offers.map((o) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:700;color:#111827;font-size:15px;">${o.name}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${o.category}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap;">
        <span style="text-decoration:line-through;color:#9ca3af;font-size:13px;">₹${o.originalPrice.toFixed(0)}</span>&nbsp;
        <span style="font-weight:900;color:${accent};font-size:17px;">₹${o.discountedPrice.toFixed(0)}</span>
        <div style="background:${accent}18;color:${accent};font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;margin-top:4px;display:inline-block;">${o.discountPercent}% OFF</div>
      </td>
    </tr>`).join('');

  enqueueEmail({
    to: customerEmail,
    subject: `🎉 Special Offer from ${restaurantName} — Don't miss out!`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px 40px;">
<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:32px 36px 24px;text-align:center;">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="${restaurantName}" width="60" height="60"
          style="width:60px;height:60px;border-radius:16px;object-fit:cover;display:inline-block;margin-bottom:14px;border:3px solid rgba(255,255,255,0.3);" />`
      : `<div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:16px;text-align:center;line-height:60px;display:inline-block;margin-bottom:14px;">
          <span style="color:#fff;font-size:26px;font-weight:900;">${restaurantName.charAt(0).toUpperCase()}</span>
        </div>`
    }
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Exclusive Offer</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;">${restaurantName}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Special prices just for you, ${customerName.split(' ')[0]}!</p>
  </div>

  <div style="padding:28px 36px;">
    <p style="color:#374151;margin:0 0 20px;line-height:1.6;font-size:14px;">We're excited to share exclusive discounts. Visit us soon to avail them!</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="margin-top:24px;background:#f9fafb;border-radius:12px;padding:14px 18px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#6b7280;">Show this email at the counter to confirm your offer price.</p>
    </div>
  </div>

  <div style="padding:16px 36px 24px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:11px;color:#d1d5db;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
  </div>
</div>
</div>
</body>
</html>`,
  });
}

// ─── Owner-facing emails (no restaurant logo needed) ──────────────────────────

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

export function sendPositiveReviewAlert(
  ownerEmail: string,
  restaurantName: string,
  stars: number,
  reviewText: string,
): void {
  const starStr = '⭐'.repeat(stars);
  enqueueEmail({
    to: ownerEmail,
    subject: `${starStr} New ${stars}-star review at ${restaurantName}!`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 36px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">New Review</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;">${restaurantName}</h1>
      <p style="margin:10px 0 0;font-size:26px;letter-spacing:3px;">${starStr}</p>
    </div>
    <div style="padding:32px 36px;">
      <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;">A customer just left a ${stars}-star review that was posted to Google:</p>
      <blockquote style="border-left:4px solid #10b981;margin:0 0 24px;padding:14px 20px;color:#374151;font-style:italic;line-height:1.7;background:#f0fdf4;border-radius:0 12px 12px 0;">${reviewText}</blockquote>
      <p style="margin:0;font-size:13px;color:#9ca3af;">Keep it up — happy customers make the best advocates.</p>
    </div>
    <div style="padding:14px 36px 20px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#d1d5db;">Powered by <strong style="color:#6366f1;">ReviewBoost ⚡</strong></p>
    </div>
  </div>
</body>
</html>`,
  }, 3);
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
  }, 2);
}
