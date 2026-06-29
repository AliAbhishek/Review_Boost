import { Request, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const addCustomerSchema = z.object({
  name:      z.string().min(1).max(100),
  email:     z.string().email(),
  phone:     z.string().optional(),
  visitDate: z.string().datetime().or(z.string().date()),
  notes:     z.string().max(300).optional(),
});

export const bulkAddSchema = z.object({
  // Each entry: "Name, email@example.com" — one per line
  csv: z.string().min(1),
});

export const addCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof addCustomerSchema>;
  const restaurantId = req.owner!.restaurantId;

  const customer = await Customer.create({
    restaurantId,
    ...data,
    visitDate: new Date(data.visitDate),
  });

  res.created({ customer });
});

export const bulkAddCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { csv } = req.body as z.infer<typeof bulkAddSchema>;
  const restaurantId = req.owner!.restaurantId;

  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const docs: { restaurantId: typeof restaurantId; name: string; email: string; visitDate: Date }[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 2) { errors.push(`Skipped: "${line}" — expected "Name, email"`); continue; }
    const [name, email] = parts;
    if (!email.includes('@')) { errors.push(`Skipped: invalid email "${email}"`); continue; }
    docs.push({ restaurantId, name, email, visitDate: new Date() });
  }

  const inserted = docs.length > 0 ? await Customer.insertMany(docs, { ordered: false }) : [];

  res.created({ inserted: inserted.length, errors });
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const skip  = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find({ restaurantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments({ restaurantId }),
  ]);

  res.paginated(customers, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId;
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, restaurantId });
  if (!customer) throw new AppError('Customer not found', 404);
  res.success({ message: 'Customer removed' });
});

// Called by the scheduler — not an HTTP endpoint
export async function getPendingEmailCustomers() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  return Customer.find({
    emailSentAt: { $exists: false },
    visitDate:   { $lte: threeHoursAgo },
  })
    .populate('restaurantId')
    .lean();
}
