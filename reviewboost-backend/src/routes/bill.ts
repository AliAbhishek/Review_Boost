import { Router } from 'express';
import { requireAuth, requireBillingAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBill, listBills, getBill, getAnalytics, validateVoucher, createBillSchema, getStaffStats } from '../controllers/billController';

const router = Router();

// Specific literal routes MUST come before /:id to prevent Express swallowing them
router.get('/validate-voucher', requireBillingAuth, validateVoucher);
router.post('/',                requireBillingAuth, validate(createBillSchema), createBill);

// Owner-only routes
router.get('/analytics',        requireAuth, getAnalytics);
router.get('/staff-stats',      requireAuth, getStaffStats);
router.get('/',                 requireAuth, listBills);
router.get('/:id',              requireAuth, getBill);

export default router;
