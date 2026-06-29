import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncControllerFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express controller so thrown errors are forwarded to next()
 * without requiring a try/catch in every handler.
 */
export const asyncHandler =
  (fn: AsyncControllerFn): RequestHandler =>
  (req, res, next): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
