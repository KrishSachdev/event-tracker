import { Router } from 'express';
import { stream } from '../controllers/stream.controller.js';

const router = Router();

router.get('/', stream); // GET /api/stream?userId=  (live updates)

export default router;
