import { Router } from 'express';
import { validate } from '../middleware/validate';
import { loginLimit } from '../middleware/rateLimiter';
import { adminLogin, adminLoginSchema } from '../controllers/adminAuthController';

const router = Router();

router.post('/login', loginLimit, validate(adminLoginSchema), adminLogin);

export default router;
