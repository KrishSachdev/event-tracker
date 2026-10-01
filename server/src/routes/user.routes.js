import { Router } from 'express';
import { login, getProfile, updateProfile } from '../controllers/user.controller.js';

const router = Router();

router.post('/', login);              // POST  /api/users        (sign in or sign up)
router.get('/:id', getProfile);       // GET   /api/users/:id
router.patch('/:id', updateProfile);  // PATCH /api/users/:id    (profile + reminder settings)

export default router;
