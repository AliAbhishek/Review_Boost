import { OwnerJwtPayload, AdminJwtPayload } from '../middleware/auth';

// Response augmentation lives in src/middleware/responseHandler.ts (declare global block).
// This file handles Request-side augmentation only.

declare global {
  namespace Express {
    interface Request {
      /** UUID injected by requestId middleware, echoed in X-Request-ID header. */
      requestId: string;
      /** Decoded owner JWT payload — set by requireAuth middleware. */
      owner?: OwnerJwtPayload;
      /** Decoded admin JWT payload — set by requireAdmin middleware. */
      admin?: AdminJwtPayload;
    }
  }
}
