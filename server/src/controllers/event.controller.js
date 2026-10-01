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
import { CATEGORIES, DEFAULT_CATEGORY } from '../services/ticketmaster.service.js';
import { AppError } from '../utils/AppError.js';

// Checks ?category= against the allowed list
function readCategory(value) {
  if (!value) return DEFAULT_CATEGORY;
  if (!CATEGORIES.some((c) => c.id === value)) throw new AppError(400, 'Please choose a valid category');
  return value;
}

// Reads ?city=&month=&date=&category=&userId= and fills in defaults
function readEventQuery(query) {
  const city = query.city ? requireString(query.city, 'City', 60) : config.defaultCity;
  const date = query.date ? validateDate(query.date) : null;

  // If a date is given, its month wins. Otherwise use ?month= or the current month.
  let month = query.month ? validateMonth(query.month) : currentMonth();
  if (date) month = date.slice(0, 7);

  const category = readCategory(query.category);
  const userId = query.userId ? validateObjectId(query.userId, 'Your account') : null;

  return { city, month, date, category, userId };
}

// GET /api/events
export const listEvents = asyncHandler(async (req, res) => {
  const params = readEventQuery(req.query);
  const events = await getEvents(params);
  res.json({ city: params.city, month: params.month, date: params.date, category: params.category, events });
});

// GET /api/events/calendar
export const calendar = asyncHandler(async (req, res) => {
  const { city, month, category } = readEventQuery(req.query);
  res.json(await getCalendar({ city, month, category }));
});

// GET /api/events/categories   (the choices for the category dropdown)
export const listCategories = (req, res) => {
  res.json({
    defaultCategory: DEFAULT_CATEGORY,
    categories: CATEGORIES.map(({ id, label }) => ({ id, label })),
  });
};

// GET /api/events/:id
export const getOneEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.id);
  const userId = req.query.userId ? validateObjectId(req.query.userId, 'Your account') : null;
  const event = await getEventById(eventId, userId);
  res.json({ event });
});
