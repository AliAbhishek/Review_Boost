import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getOwnerStats,
  getOwnerReviews,
  getOwnerProfile,
  updateOwnerProfile,
  updateProfileSchema,
} from '../controllers/ownerController';

const router = Router();

router.use(requireAuth);

router.get('/stats', getOwnerStats);
router.get('/reviews', getOwnerReviews);
router.get('/profile', getOwnerProfile);
router.put('/profile', validate(updateProfileSchema), updateOwnerProfile);

export default router;
