import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import {
  createRestaurant,
  getAllRestaurants,
  getRestaurantBySlug,
  updateRestaurant,
  deleteRestaurant,
  getQRCode,
  getStats,
  getRestaurantMenu,
  getRestaurantOverview,
  createRestaurantSchema,
  updateRestaurantSchema,
} from '../controllers/adminController';

const router = Router();

router.use(requireAdmin);

router.post('/restaurant', validate(createRestaurantSchema), createRestaurant);
router.get('/restaurants', getAllRestaurants);
router.get('/stats', getStats);
router.get('/restaurant/:slug', getRestaurantBySlug);
router.put('/restaurant/:id', validate(updateRestaurantSchema), updateRestaurant);
router.delete('/restaurant/:id', deleteRestaurant);
router.get('/restaurant/:id/menu', getRestaurantMenu);
router.get('/restaurant/:id/overview', getRestaurantOverview);
router.get('/qr/:slug', getQRCode);

export default router;
