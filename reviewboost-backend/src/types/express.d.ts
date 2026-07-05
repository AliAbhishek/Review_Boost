import { OwnerJwtPayload, AdminJwtPayload } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Set by requireAuth (owners) or requireBillingAuth (owners + staff). role may be 'owner' | 'staff'. */
      owner?: OwnerJwtPayload & { role: string; staffName?: string };
      admin?: AdminJwtPayload;
    }
  }
}
