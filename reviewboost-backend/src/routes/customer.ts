import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addCustomer,
  bulkAddCustomers,
  listCustomers,
  getCustomer,
  deleteCustomer,
  sendReviewForBill,
  addCustomerSchema,
  bulkAddSchema,
} from '../controllers/customerController';

const router = Router();

router.use(requireAuth);

router.get('/',                listCustomers);
router.post('/',               validate(addCustomerSchema),  addCustomer);
router.post('/bulk',           validate(bulkAddSchema),      bulkAddCustomers);
router.get('/:id',             getCustomer);
router.post('/:id/send-review', sendReviewForBill);
router.delete('/:id',          deleteCustomer);

export default router;
