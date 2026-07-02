import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getStatus, connect, disconnect } from '../controllers/whatsappController';

const router = Router();
router.use(requireAuth);

router.get('/status',     getStatus);
router.post('/connect',   connect);
router.delete('/disconnect', disconnect);

export default router;
