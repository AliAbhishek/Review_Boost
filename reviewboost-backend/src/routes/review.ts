import { Router } from 'express';
import { validate } from '../middleware/validate';
import { reviewGenerateLimit } from '../middleware/rateLimiter';
import {
  getRestaurantPublic,
  generateReviewOptions,
  logReview,
  generateReviewSchema,
  logReviewSchema,
} from '../controllers/reviewController';

const router = Router();

router.get('/:slug', getRestaurantPublic);
router.post('/generate', reviewGenerateLimit, validate(generateReviewSchema), generateReviewOptions);
router.post('/log', validate(logReviewSchema), logReview);

export default router;
