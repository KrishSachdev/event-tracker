import { Router } from 'express';
import { createRsvp, deleteRsvp } from '../controllers/rsvp.controller.js';

const router = Router();

router.post('/', createRsvp);            // POST   /api/rsvps
router.delete('/:eventId', deleteRsvp);  // DELETE /api/rsvps/:eventId?userId=

export default router;
