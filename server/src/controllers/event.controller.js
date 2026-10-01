// Controllers read and validate the request, call a service, and send the response.
// No business logic here.
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { currentMonth } from '../utils/dates.js';
import {
  requireString,
  validateMonth,
  validateDate,
  validateEventId,
  validateObjectId,
} from '../utils/validators.js';
import { getEvents, getCalendar, getEventById } from '../services/event.service.js';

// Reads ?city=&month=&date=&userId= and fills in defaults
function readEventQuery(query) {
  const city = query.city ? requireString(query.city, 'city', 60) : config.defaultCity;
  const date = query.date ? validateDate(query.date) : null;

  // If a date is given, its month wins. Otherwise use ?month= or the current month.
  let month = query.month ? validateMonth(query.month) : currentMonth();
  if (date) month = date.slice(0, 7);

  const userId = query.userId ? validateObjectId(query.userId, 'userId') : null;

  return { city, month, date, userId };
}

// GET /api/events
export const listEvents = asyncHandler(async (req, res) => {
  const params = readEventQuery(req.query);
  const events = await getEvents(params);
  res.json({ city: params.city, month: params.month, date: params.date, events });
});

// GET /api/events/calendar
export const calendar = asyncHandler(async (req, res) => {
  const { city, month } = readEventQuery(req.query);
  res.json(await getCalendar({ city, month }));
});

// GET /api/events/:id
export const getOneEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.id);
  const userId = req.query.userId ? validateObjectId(req.query.userId, 'userId') : null;
  const event = await getEventById(eventId, userId);
  res.json({ event });
});
