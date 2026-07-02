export function receiptWA(
  customerName: string,
  restaurantName: string,
  receiptNumber: string,
  items: { name: string; quantity: number; subtotal: number }[],
  grandTotal: number,
  reviewUrl?: string,
  voucherTeaser?: { discountPercent: number } | null,
): string {
  const first = customerName.split(' ')[0];
  const lines = items.map((i) => `• ${i.name} × ${i.quantity}  ₹${i.subtotal.toFixed(0)}`).join('\n');
  let msg = `🧾 *Receipt — ${restaurantName}*\n\nHi ${first}! Thanks for visiting 😊\n\n${lines}\n──────────────\n*Total: ₹${grandTotal.toFixed(2)}* (${receiptNumber})`;
  if (reviewUrl) {
    msg += `\n\n📝 Enjoyed your visit? *Leave a quick review:*\n${reviewUrl}`;
    if (voucherTeaser) msg += `\n\n🎁 Review now & earn *${voucherTeaser.discountPercent}% OFF* your next order!`;
  }
  return msg;
}

export function reviewRequestWA(customerName: string, restaurantName: string, reviewUrl: string): string {
  const first = customerName.split(' ')[0];
  return `👋 Hi *${first}*!\n\nHow was your recent visit to *${restaurantName}*? 😊\n\nShare your experience in *30 seconds* — it means a lot to us!\n\n👉 ${reviewUrl}\n\n_Your review helps us grow and serve you better. Thank you!_ 🙏`;
}

export function voucherWA(
  customerName: string,
  restaurantName: string,
  code: string,
  discountPercent: number,
  discountText: string,
  expiresAt: Date,
): string {
  const first  = customerName.split(' ')[0];
  const expiry = expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `🎁 *Your Reward from ${restaurantName}*\n\nHi ${first}! Thank you for your review! ⭐\n\nYou've earned a special voucher:\n\n💰 *${discountText}*\n🔑 Code: *${code}*\n📅 Valid till: ${expiry}\n\nShare this code at your next order and the discount applies automatically! 😊`;
}

export function offerWA(
  customerName: string,
  restaurantName: string,
  offers: { name: string; originalPrice: number; discountedPrice: number; discountPercent: number }[],
): string {
  const first = customerName.split(' ')[0];
  const lines = offers.map((o) => `• *${o.name}*  ~~₹${o.originalPrice.toFixed(0)}~~ → *₹${o.discountedPrice.toFixed(0)}* (${o.discountPercent}% OFF)`).join('\n');
  return `🔥 *Special Offer from ${restaurantName}!*\n\nHi ${first}! Exclusive deals just for you 🎉\n\n${lines}\n\n_Visit us soon — offer valid for a limited time!_ 🍽️`;
}
