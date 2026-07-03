import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { Types } from 'mongoose';

export interface OwnerJwtPayload {
  id: string;
  role: 'owner';
  restaurantId: string;
}

export interface StaffJwtPayload {
  restaurantId: string;
  role: 'staff';
}

export interface AdminJwtPayload {
  id: string;
  email: string;
  role: 'admin';
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Validates an owner JWT and attaches the decoded payload to req.owner.
 * Returns 401 if the token is missing, invalid, or not an owner token.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as OwnerJwtPayload;
    if (payload.role !== 'owner') {
      next(new AppError('Invalid token role', 403));
      return;
    }
    req.owner = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/**
 * Accepts both owner and staff JWTs — used on billing routes.
 * Sets req.owner so existing controllers work without changes.
 */
export function requireBillingAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as OwnerJwtPayload | StaffJwtPayload;
    if (payload.role !== 'owner' && payload.role !== 'staff') {
      next(new AppError('Invalid token role', 403));
      return;
    }
    req.owner = { id: (payload as OwnerJwtPayload).id ?? '', role: payload.role as 'owner', restaurantId: payload.restaurantId };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/**
 * Validates an admin JWT (signed with ADMIN_SECRET) and attaches payload to req.admin.
 * Returns 401/403 if the token is missing, invalid, or not an admin token.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new AppError('Admin authentication required', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.ADMIN_SECRET) as AdminJwtPayload;
    if (payload.role !== 'admin') {
      next(new AppError('Forbidden: admin access required', 403));
      return;
    }
    req.admin = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired admin token', 401));
  }
}

/** Signs a JWT for a restaurant owner. */
export function signOwnerToken(ownerId: Types.ObjectId, restaurantId: Types.ObjectId): string {
  return jwt.sign(
    { id: ownerId.toString(), role: 'owner', restaurantId: restaurantId.toString() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

/** Signs a short-lived JWT for staff / cashier access (billing only). */
export function signStaffToken(restaurantId: string): string {
  return jwt.sign(
    { restaurantId, role: 'staff' },
    env.JWT_SECRET,
    { expiresIn: '12h' },
  );
}

/** Signs a JWT for an admin (uses ADMIN_SECRET, not JWT_SECRET). */
export function signAdminToken(adminId: Types.ObjectId, email: string): string {
  return jwt.sign(
    { id: adminId.toString(), email, role: 'admin' },
    env.ADMIN_SECRET,
    { expiresIn: '30d' },
  );
}
