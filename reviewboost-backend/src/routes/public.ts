import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requestDemo, requestDemoSchema } from '../controllers/publicController';

const router = Router();

router.post('/request-demo', validate(requestDemoSchema), requestDemo);

export default router;
