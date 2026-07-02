import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBill, listBills, getBill, getAnalytics, validateVoucher, createBillSchema } from '../controllers/billController';

const router = Router();
router.use(requireAuth);

router.get('/analytics',       getAnalytics);
router.get('/validate-voucher', validateVoucher);
router.get('/',                listBills);
router.post('/',               validate(createBillSchema), createBill);
router.get('/:id',             getBill);

export default router;
