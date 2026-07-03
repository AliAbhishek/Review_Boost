import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getOwnerStats,
  getOwnerReviews,
  getOwnerProfile,
  updateOwnerProfile,
  updateProfileSchema,
  uploadRestaurantLogo,
  deleteRestaurantLogo,
  getReviewQR,
  setBillingPin,
  setBillingPinSchema,
  removeBillingPin,
} from '../controllers/ownerController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/stats',   getOwnerStats);
router.get('/reviews', getOwnerReviews);
router.get('/profile', getOwnerProfile);
router.put('/profile', validate(updateProfileSchema), updateOwnerProfile);

router.post('/logo',   upload.single('logo'), uploadRestaurantLogo);
router.delete('/logo', deleteRestaurantLogo);

router.get('/qr',            getReviewQR);
router.post('/billing-pin',  validate(setBillingPinSchema), setBillingPin);
router.delete('/billing-pin', removeBillingPin);

export default router;
