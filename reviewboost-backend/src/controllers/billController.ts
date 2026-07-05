import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Bill } from '../models/Bill';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { VoucherRedemption, type IVoucherRedemptionDocument } from '../models/VoucherRedemption';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendReceiptEmail } from '../services/emailService';
import { sendWA } from '../services/whatsappService';
import { receiptWA } from '../services/whatsappMessages';
import { Voucher } from '../models/Voucher';
import { ReviewLog } from '../models/ReviewLog';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const billItemSchema = z.object({
  name:     z.string().min(1),
  price:    z.number().min(0),
  quantity: z.number().int().min(1),
});

export const createBillSchema = z.object({
  customer: z.object({
    name:  z.string().min(1).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
  }),
  items:       z.array(billItemSchema).min(1),
  voucherCode: z.string().optional(),
});

export const validateVoucher = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.query.code as string)?.trim().toUpperCase();
  if (!code) throw new AppError('Code is required', 400);

  const restaurantId = req.owner!.restaurantId;
  const redemption   = await VoucherRedemption.findOne({ code, restaurantId }).lean();

  if (!redemption)                              throw new AppError('Invalid voucher code', 404);
  if (redemption.status === 'used')             throw new AppError('This voucher has already been used', 400);
  if (redemption.status === 'expired' || redemption.expiresAt < new Date())
                                                throw new AppError('This voucher has expired', 400);

  res.success({
    valid:           true,
    code:            redemption.code,
    discountPercent: redemption.discountPercent,
    customerName:    redemption.customerName,
    customerEmail:   redemption.customerEmail,
    expiresAt:       redemption.expiresAt,
  });
});

export const createBill = asyncHandler(async (req: Request, res: Response) => {
  const { customer, items, voucherCode } = req.body as z.infer<typeof createBillSchema>;
  const restaurantId = req.owner!.restaurantId;

  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  // Compute line items server-side — never trust client totals
  const lineItems = items.map((item) => ({
    name:     item.name,
    price:    item.price,
    quantity: item.quantity,
    subtotal: Math.round(item.price * item.quantity * 100) / 100,
  }));
  const subtotal = Math.round(lineItems.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;

  // Apply tax config
  const taxCfg = restaurant.taxConfig;
  const taxLines: { label: string; rate: number; amount: number }[] = [];
  let totalTax = 0;

  if (taxCfg?.gstEnabled) {
    if (taxCfg.useIgst && taxCfg.igst > 0) {
      const amt = Math.round(subtotal * taxCfg.igst) / 100;
      taxLines.push({ label: `IGST ${taxCfg.igst}%`, rate: taxCfg.igst, amount: amt });
      totalTax += amt;
    } else {
      if (taxCfg.cgst > 0) {
        const amt = Math.round(subtotal * taxCfg.cgst) / 100;
        taxLines.push({ label: `CGST ${taxCfg.cgst}%`, rate: taxCfg.cgst, amount: amt });
        totalTax += amt;
      }
      if (taxCfg.sgst > 0) {
        const amt = Math.round(subtotal * taxCfg.sgst) / 100;
        taxLines.push({ label: `SGST ${taxCfg.sgst}%`, rate: taxCfg.sgst, amount: amt });
        totalTax += amt;
      }
    }
  }

  if (taxCfg?.serviceChargeEnabled && taxCfg.serviceCharge > 0) {
    const amt = Math.round(subtotal * taxCfg.serviceCharge) / 100;
    taxLines.push({ label: `Service Charge ${taxCfg.serviceCharge}%`, rate: taxCfg.serviceCharge, amount: amt });
    totalTax += amt;
  }

  totalTax = Math.round(totalTax * 100) / 100;
  let grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

  // Validate and apply voucher
  let voucherApplied: { code: string; discountPercent: number; discountAmount: number; redemptionId: unknown; customerName: string } | undefined;
  let redemptionDoc: IVoucherRedemptionDocument | null = null;

  if (voucherCode) {
    const code = voucherCode.trim().toUpperCase();
    redemptionDoc = await VoucherRedemption.findOne({ code, restaurantId });
    if (redemptionDoc && redemptionDoc.status === 'earned' && redemptionDoc.expiresAt >= new Date()) {
      const discountAmount = Math.round(grandTotal * redemptionDoc.discountPercent / 100 * 100) / 100;
      grandTotal = Math.round((grandTotal - discountAmount) * 100) / 100;
      voucherApplied = {
        code:            redemptionDoc.code,
        discountPercent: redemptionDoc.discountPercent,
        discountAmount,
        redemptionId:    redemptionDoc._id,
        customerName:    redemptionDoc.customerName,
      };
    }
  }

  // Sequential receipt number per restaurant
  const count = await Bill.countDocuments({ restaurantId });
  const receiptNumber = `#${String(count + 1).padStart(4, '0')}`;

  // Generate token now so it can be stored on both the bill and the customer
  const emailToken = customer.email ? crypto.randomBytes(32).toString('hex') : undefined;

  const bill = await Bill.create({
    restaurantId,
    receiptNumber,
    customer: {
      name:  customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
    },
    items: lineItems,
    subtotal,
    taxLines,
    totalTax,
    grandTotal,
    staffName:  req.owner?.staffName,
    ...(voucherApplied  ? { voucherApplied }  : {}),
    ...(emailToken      ? { emailToken }       : {}),
  });

  // Mark redemption as used
  if (redemptionDoc && voucherApplied) {
    await VoucherRedemption.findByIdAndUpdate(redemptionDoc._id, {
      status:          'used',
      redeemedBillId:  bill._id,
      discountApplied: voucherApplied.discountAmount,
      redeemedAt:      new Date(),
    });
  }

  // Fetch active voucher teaser and review URL (used by both email and WA paths)
  const activeVoucher = await Voucher.findOne({ restaurantId, isActive: true }).lean();
  const voucherTeaser = activeVoucher
    ? { title: activeVoucher.title, discountPercent: activeVoucher.discountPercent }
    : null;
  const reviewUrl = emailToken
    ? `${env.FRONTEND_URL}/r/${restaurant.slug}?token=${emailToken}`
    : undefined;

  // Email flow: add to review pipeline + send receipt email
  if (customer.email && emailToken) {
    const orderedItems = items.map((i) => i.name).join(', ');

    Customer.findOneAndUpdate(
      { restaurantId, email: customer.email },
      {
        $set: {
          name:         customer.name,
          phone:        customer.phone || undefined,
          visitDate:    new Date(),
          orderedItems,
          emailToken,
        },
        $unset:       { emailSentAt: '' },
        $setOnInsert: { restaurantId },
      },
      { upsert: true },
    ).catch((err: unknown) =>
      logger.error(`Failed to upsert customer from bill: ${String(err)}`),
    );

    let upiQrDataUrl: string | null = null;
    if (restaurant.upiId) {
      const upiString = `upi://pay?pa=${encodeURIComponent(restaurant.upiId)}&pn=${encodeURIComponent(restaurant.name)}&am=${grandTotal.toFixed(2)}&cu=INR`;
      upiQrDataUrl = await QRCode.toDataURL(upiString, {
        width: 320,
        margin: 1,
        color: { dark: '#166534', light: '#f0fdf4' },
      }).catch(() => null);
    }

    sendReceiptEmail(
      customer.name,
      customer.email,
      restaurant.name,
      bill.receiptNumber,
      lineItems,
      subtotal,
      taxLines,
      totalTax,
      grandTotal,
      restaurant.logoColor,
      voucherApplied ?? null,
      voucherTeaser,
      restaurant.slug,
      emailToken,
      restaurant.logoUrl,
      upiQrDataUrl,
    );
  }

  // WhatsApp: send whenever a phone number is available (independent of email)
  if (customer.phone) {
    sendWA(
      restaurantId.toString(),
      customer.phone,
      receiptWA(customer.name, restaurant.name, bill.receiptNumber, lineItems, grandTotal, reviewUrl, voucherTeaser),
    );
  }

  res.created({ bill });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date) {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
}
function addMs(d: Date, ms: number) { return new Date(d.getTime() + ms); }
const DAY = 86_400_000;

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const period = (req.query.period as string) || 'week';

  const now = new Date();
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;

  if (period === 'day') {
    from = startOfDay(now);
    to   = endOfDay(now);
    prevFrom = startOfDay(addMs(now, -DAY));
    prevTo   = endOfDay(addMs(now, -DAY));
  } else if (period === 'month') {
    from = startOfDay(addMs(now, -29 * DAY));
    to   = endOfDay(now);
    prevFrom = startOfDay(addMs(from, -30 * DAY));
    prevTo   = addMs(from, -1);
  } else if (period === 'custom') {
    from = new Date(req.query.from as string);
    to   = new Date(req.query.to as string);
    to   = endOfDay(to);
    const span = to.getTime() - from.getTime();
    prevFrom = new Date(from.getTime() - span - 1);
    prevTo   = new Date(from.getTime() - 1);
  } else {
    // week (default)
    from = startOfDay(addMs(now, -6 * DAY));
    to   = endOfDay(now);
    prevFrom = startOfDay(addMs(from, -7 * DAY));
    prevTo   = addMs(from, -1);
  }

  const [bills, prevBills, voucherStats, reviewsInPeriod, emailsSentInPeriod] = await Promise.all([
    Bill.find({ restaurantId, createdAt: { $gte: from, $lte: to } }).lean(),
    Bill.find({ restaurantId, createdAt: { $gte: prevFrom, $lte: prevTo } }).lean(),
    VoucherRedemption.find({ restaurantId, earnedAt: { $gte: from, $lte: to } }).lean(),
    ReviewLog.countDocuments({ restaurantId, timestamp: { $gte: from, $lte: to } }),
    Customer.countDocuments({ restaurantId, emailSentAt: { $gte: from, $lte: to } }),
  ]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalRevenue = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalBills   = bills.length;
  const avgOrder     = totalBills ? Math.round((totalRevenue / totalBills) * 100) / 100 : 0;
  const totalItems   = bills.reduce((s, b) => s + b.items.reduce((si, i) => si + i.quantity, 0), 0);
  const prevRevenue  = prevBills.reduce((s, b) => s + b.grandTotal, 0);
  const prevTotal    = prevBills.length;

  // ── Timeline ───────────────────────────────────────────────────────────────
  const buckets = new Map<string, { revenue: number; bills: number }>();

  for (const bill of bills) {
    const d = new Date(bill.createdAt);
    const key = period === 'day'
      ? `${String(d.getHours()).padStart(2, '0')}:00`
      : d.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { revenue: 0, bills: 0 };
    b.revenue += bill.grandTotal;
    b.bills   += 1;
    buckets.set(key, b);
  }

  const timeline: { label: string; revenue: number; bills: number }[] = [];
  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const key = `${String(h).padStart(2, '0')}:00`;
      timeline.push({ label: key, ...(buckets.get(key) ?? { revenue: 0, bills: 0 }) });
    }
  } else {
    const days = Math.round((to.getTime() - from.getTime()) / DAY) + 1;
    for (let d = 0; d < days; d++) {
      const date = new Date(from.getTime() + d * DAY);
      const key  = date.toISOString().slice(0, 10);
      timeline.push({ label: key, ...(buckets.get(key) ?? { revenue: 0, bills: 0 }) });
    }
  }

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const [menuItems] = await Promise.all([
    MenuItem.find({ restaurantId }).lean(),
  ]);

  const itemMap = new Map<string, { _id: string; name: string; category: string; price: number; originalPrice?: number; discountPercent?: number; quantity: number; revenue: number; orders: number; isAvailable: boolean }>();

  // Seed every menu item with zeros so unsold items appear in the list
  for (const mi of menuItems) {
    itemMap.set(mi.name, { _id: mi._id.toString(), name: mi.name, category: mi.category, price: mi.price, originalPrice: mi.originalPrice, discountPercent: mi.discountPercent, quantity: 0, revenue: 0, orders: 0, isAvailable: mi.isAvailable });
  }

  // Overlay actual sales data
  for (const bill of bills) {
    const seen = new Set<string>();
    for (const item of bill.items) {
      const e = itemMap.get(item.name) ?? { _id: '', name: item.name, category: '', price: item.price, quantity: 0, revenue: 0, orders: 0, isAvailable: true };
      e.quantity += item.quantity;
      e.revenue  += item.subtotal;
      if (!seen.has(item.name)) { e.orders += 1; seen.add(item.name); }
      itemMap.set(item.name, e);
    }
  }

  // Sort: items with sales first (by revenue desc), then unsold items alphabetically
  const leaderboard = Array.from(itemMap.values()).sort((a, b) => {
    if (a.revenue !== b.revenue) return b.revenue - a.revenue;
    return a.name.localeCompare(b.name);
  });

  const vouchersIssued   = voucherStats.length;
  const vouchersRedeemed = voucherStats.filter((v) => v.status === 'used').length;
  const totalVoucherDiscount = bills.reduce((s, b) => s + (b.voucherApplied?.discountAmount ?? 0), 0);

  const conversionRate = emailsSentInPeriod > 0
    ? Math.round((reviewsInPeriod / emailsSentInPeriod) * 100)
    : 0;

  res.success({
    summary: { totalRevenue, totalBills, avgOrder, totalItems, prevRevenue, prevBills: prevTotal },
    vouchers: {
      issued:          vouchersIssued,
      redeemed:        vouchersRedeemed,
      pending:         vouchersIssued - vouchersRedeemed,
      totalDiscount:   Math.round(totalVoucherDiscount * 100) / 100,
      redemptionRate:  vouchersIssued ? Math.round((vouchersRedeemed / vouchersIssued) * 100) : 0,
    },
    reviews: {
      count:          reviewsInPeriod,
      emailsSent:     emailsSentInPeriod,
      conversionRate,
    },
    timeline,
    leaderboard,
    period: { from: from.toISOString(), to: to.toISOString() },
  });
});

export const listBills = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [bills, total] = await Promise.all([
    Bill.find({ restaurantId: req.owner!.restaurantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bill.countDocuments({ restaurantId: req.owner!.restaurantId }),
  ]);

  res.paginated(bills, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    restaurantId: req.owner!.restaurantId,
  }).lean();
  if (!bill) throw new AppError('Bill not found', 404);
  res.success({ bill });
});

// ─── Staff Performance Stats ──────────────────────────────────────────────────

export const getStaffStats = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;

  const period = (req.query.period as string) || 'week';
  const now = new Date();
  let from: Date;

  if (period === 'day') {
    from = new Date(now); from.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    from = new Date(now.getTime() - 29 * 86_400_000);
  } else {
    from = new Date(now.getTime() - 6 * 86_400_000);
  }

  const [billStats, orderStats] = await Promise.all([
    Bill.aggregate([
      { $match: { restaurantId, staffName: { $exists: true, $ne: null }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: '$staffName',
          bills:    { $sum: 1 },
          revenue:  { $sum: '$grandTotal' },
          avgBill:  { $avg: '$grandTotal' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Bill.aggregate([
      { $match: { restaurantId, createdAt: { $gte: from } } },
      { $group: { _id: null, total: { $sum: 1 }, totalRevenue: { $sum: '$grandTotal' } } },
    ]),
  ]);

  const totals = orderStats[0] ?? { total: 0, totalRevenue: 0 };

  const staff = billStats.map((s) => ({
    name:       s._id as string,
    bills:      s.bills as number,
    revenue:    Math.round((s.revenue as number) * 100) / 100,
    avgBill:    Math.round((s.avgBill as number) * 100) / 100,
    share:      totals.total ? Math.round((s.bills / totals.total) * 100) : 0,
  }));

  res.success({ staff, period, from: from.toISOString(), totalBills: totals.total, totalRevenue: Math.round(totals.totalRevenue * 100) / 100 });
});
