import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    status: 'fail',
    message: 'Too many requests. Please try again later.',
  });
}

/** 10 requests per IP per hour — applied to /api/review/generate */
export const reviewGenerateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
});

/** 5 login attempts per IP per 15 minutes — applied to /api/auth/login */
export const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
});
