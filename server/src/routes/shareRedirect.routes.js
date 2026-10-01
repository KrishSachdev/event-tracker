import { Router } from 'express';
import { openLink } from '../controllers/share.controller.js';

const router = Router();

router.get('/:code', openLink); // GET /s/:code  (count the click, then redirect to the app)

export default router;
