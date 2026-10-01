import { Router } from 'express';
import { listEvents, calendar, getOneEvent } from '../controllers/event.controller.js';

const router = Router();

router.get('/', listEvents);          // GET /api/events?city=&month=&date=&userId=
router.get('/calendar', calendar);    // GET /api/events/calendar?city=&month=
router.get('/:id', getOneEvent);      // GET /api/events/:id?userId=  (keep this last, ':id' matches anything)

export default router;
