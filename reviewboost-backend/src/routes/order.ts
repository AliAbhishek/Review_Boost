import { Router } from 'express';
import { requireBillingAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createOrder,
  createOrderSchema,
  updateOrderStatus,
  listOrders,
  listMyOrders,
  getOrder,
  createPublicOrder,
} from '../controllers/orderController';

const router = Router();

// Public — customer self-order from table QR
router.post('/public/:slug/:tableNumber', validate(createOrderSchema), createPublicOrder);

// Staff + owner
router.use(requireBillingAuth);
router.get('/mine', listMyOrders);
router.get('/', listOrders);
router.post('/', validate(createOrderSchema), createOrder);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;
