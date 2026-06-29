import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Assigns a UUID to every request and echoes it in the X-Request-ID response header.
 * Reuses a client-supplied X-Request-ID if present (useful for distributed tracing).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
