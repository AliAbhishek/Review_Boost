import { Router } from 'express';
import { requireAuth, requireBillingAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBill, listBills, getBill, getAnalytics, validateVoucher, createBillSchema, getStaffStats } from '../controllers/billController';

const router = Router();

// Owner-only
router.get('/analytics',        requireAuth, getAnalytics);
router.get('/staff-stats',      requireAuth, getStaffStats);
router.get('/',                 requireAuth, listBills);
router.get('/:id',              requireAuth, getBill);

// Staff + owner (cashier needs to create bills and validate vouchers)
router.get('/validate-voucher', requireBillingAuth, validateVoucher);
router.post('/',                requireBillingAuth, validate(createBillSchema), createBill);

export default router;
