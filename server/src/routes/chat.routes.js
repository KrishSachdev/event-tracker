import { Router } from 'express';
import { sendMessage } from '../controllers/chat.controller.js';

const router = Router();

router.post('/', sendMessage); // POST /api/chat  (ask the AI assistant)

export default router;
