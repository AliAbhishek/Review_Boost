import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getVoucher, upsertVoucher, deleteVoucher, upsertVoucherSchema } from '../controllers/voucherController';

const router = Router();

router.use(requireAuth);

router.get('/',    getVoucher);
router.put('/',    validate(upsertVoucherSchema), upsertVoucher);
router.delete('/', deleteVoucher);

export default router;
