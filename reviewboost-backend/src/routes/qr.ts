import { Router } from 'express';
import { Restaurant } from '../models/Restaurant';
import { generateQRCode } from '../services/qrService';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/** Public endpoint — returns the QR PNG for a restaurant slug. Cacheable for 24 hours. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const buffer = await generateQRCode(req.params.slug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }),
);

export default router;
