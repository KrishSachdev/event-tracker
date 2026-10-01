// Collects all /api routes in one place
import { Router } from 'express';
import eventRoutes from './event.routes.js';
import userRoutes from './user.routes.js';
import rsvpRoutes from './rsvp.routes.js';
import shareRoutes from './share.routes.js';
import streamRoutes from './stream.routes.js';

const router = Router();

router.use('/events', eventRoutes); // /api/events...
router.use('/users', userRoutes);   // /api/users...
router.use('/rsvps', rsvpRoutes);   // /api/rsvps...
router.use('/share', shareRoutes);  // /api/share
router.use('/stream', streamRoutes); // /api/stream (live updates)

export default router;
