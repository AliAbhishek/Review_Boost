import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  bulkAddMenuItems,
  applyOffer,
  bulkApplyOffer,
  menuItemSchema,
  updateMenuItemSchema,
  bulkMenuSchema,
  applyOfferSchema,
  bulkOfferSchema,
} from '../controllers/menuController';

const router = Router();
router.use(requireAuth);

router.get('/',               listMenuItems);
router.post('/',              validate(menuItemSchema),       addMenuItem);
router.post('/bulk',          validate(bulkMenuSchema),       bulkAddMenuItems);
router.post('/bulk-offer',    validate(bulkOfferSchema),      bulkApplyOffer);
router.put('/:id',            validate(updateMenuItemSchema),  updateMenuItem);
router.post('/:id/offer',     validate(applyOfferSchema),     applyOffer);
router.delete('/:id',         deleteMenuItem);

export default router;
