import { Router } from 'express';
import { listEvents, calendar, listCategories, getOneEvent } from '../controllers/event.controller.js';

const router = Router();

router.get('/', listEvents);                // GET /api/events?city=&month=&date=&category=&userId=
router.get('/calendar', calendar);          // GET /api/events/calendar?city=&month=&category=
router.get('/categories', listCategories);  // GET /api/events/categories
router.get('/:id', getOneEvent);            // GET /api/events/:id?userId=  (keep this last, ':id' matches anything)

export default router;
