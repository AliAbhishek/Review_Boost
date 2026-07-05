import { Request, Response } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { emitToRestaurant } from '../services/socketService';

const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name:       z.string().min(1),
  price:      z.number().min(0),
  quantity:   z.number().int().min(1),
  notes:      z.string().optional(),
});

export const createOrderSchema = z.object({
  tableNumber: z.string().optional(),
  customer: z.object({
    name:  z.string().min(1).max(100),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
  }).refine(
    (c) => !!(c.phone?.trim() || c.email?.trim()),
    { message: 'At least one of phone or email is required', path: ['phone'] },
  ),
  items:  z.array(orderItemSchema).min(1),
  notes:  z.string().optional(),
  orderedBy: z.enum(['staff', 'customer']).default('staff'),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createOrderSchema>;
  const restaurantId = req.owner!.restaurantId;

  // Compute subtotals server-side
  const items = body.items.map((item) => ({
    ...item,
    menuItemId: item.menuItemId as unknown,
    subtotal: Math.round(item.price * item.quantity * 100) / 100,
  }));
  const subtotal = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;

  // Sequential KOT number per restaurant
  const count = await Order.countDocuments({ restaurantId });
  const kotNumber = `KOT-${String(count + 1).padStart(4, '0')}`;

  const order = await Order.create({
    restaurantId,
    tableNumber: body.tableNumber,
    customer:    body.customer,
    items,
    subtotal,
    status:    'pending',
    orderedBy: body.orderedBy ?? 'staff',
    staffName: req.owner?.staffName,
    kotNumber,
    notes: body.notes,
  });

  // Broadcast to kitchen display
  emitToRestaurant(restaurantId.toString(), 'order:new', order);

  res.created({ order });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id }    = req.params;
  const { status } = req.body as { status: string };

  const allowed = ['pending', 'preparing', 'ready', 'billed', 'cancelled'];
  if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

  const restaurantId = req.owner!.restaurantId;
  const order = await Order.findOneAndUpdate(
    { _id: id, restaurantId },
    { $set: { status } },
    { new: true },
  );
  if (!order) throw new AppError('Order not found', 404);

  emitToRestaurant(restaurantId.toString(), 'order:updated', order);

  res.success({ order });
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const statusFilter = req.query.status as string | undefined;
  const fromFilter   = req.query.from as string | undefined;
  const toFilter     = req.query.to   as string | undefined;

  const query: Record<string, unknown> = { restaurantId };
  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  } else if (!statusFilter) {
    query.status = { $in: ['pending', 'preparing', 'ready'] };
  }
  if (fromFilter || toFilter) {
    const dateRange: Record<string, Date> = {};
    if (fromFilter) dateRange.$gte = new Date(fromFilter);
    if (toFilter)   dateRange.$lte = new Date(toFilter);
    query.createdAt = dateRange;
  }

  const orders = await Order.find(query).sort({ createdAt: 1 }).lean();
  res.success({ orders });
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { restaurantId, staffName } = req.owner!;
  if (!staffName) throw new AppError('Not a staff token', 401);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const orders = await Order.find({
    restaurantId,
    staffName,
    createdAt: { $gte: today },
  }).sort({ createdAt: -1 }).lean();

  res.success({ orders });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({
    _id: req.params.id,
    restaurantId: req.owner!.restaurantId,
  }).lean();
  if (!order) throw new AppError('Order not found', 404);
  res.success({ order });
});

// Public endpoint — customer creates an order via table QR (no auth required)
export const createPublicOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createOrderSchema>;
  const { slug, tableNumber } = req.params;

  const restaurant = await Restaurant.findOne({ slug, isActive: true }).lean();
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const restaurantId = restaurant._id;

  const items = body.items.map((item) => ({
    ...item,
    menuItemId: item.menuItemId as unknown,
    subtotal: Math.round(item.price * item.quantity * 100) / 100,
  }));
  const subtotal = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;

  const count = await Order.countDocuments({ restaurantId });
  const kotNumber = `KOT-${String(count + 1).padStart(4, '0')}`;

  const order = await Order.create({
    restaurantId,
    tableNumber: tableNumber || body.tableNumber,
    customer:    body.customer,
    items,
    subtotal,
    status:    'pending',
    orderedBy: 'customer',
    kotNumber,
    notes: body.notes,
  });

  emitToRestaurant(restaurantId.toString(), 'order:new', order);

  res.created({ order });
});
