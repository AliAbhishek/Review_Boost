import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { loginLimit } from '../middleware/rateLimiter';
import {
  register,
  login,
  getMe,
  staffLogin,
  registerSchema,
  loginSchema,
  staffLoginSchema,
} from '../controllers/authController';

const router = Router();

router.post('/register',    validate(registerSchema),     register);
router.post('/login',       loginLimit, validate(loginSchema), login);
router.post('/staff-login', loginLimit, validate(staffLoginSchema), staffLogin);
router.get('/me',           requireAuth, getMe);

export default router;
