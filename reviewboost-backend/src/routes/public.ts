import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requestDemo, requestDemoSchema, getPublicMenu } from '../controllers/publicController';

const router = Router();

router.get('/menu/:slug', getPublicMenu);
router.post('/request-demo', validate(requestDemoSchema), requestDemo);

export default router;
