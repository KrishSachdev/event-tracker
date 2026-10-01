import { Router } from 'express';
import { createLink } from '../controllers/share.controller.js';

const router = Router();

router.post('/', createLink); // POST /api/share  (create a Friend Invite link)

export default router;
