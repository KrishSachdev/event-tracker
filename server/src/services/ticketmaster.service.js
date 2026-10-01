// Talks to the Ticketmaster Discovery API and turns its responses into our simple event shape
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { getCached, setCached } from '../utils/cache.js';
import { daysInMonth, formatDisplayDate, formatDisplayTime } from '../utils/dates.js';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // keep results for 5 minutes

// Sends a GET request to Ticketmaster and returns the JSON (or null if not found)
async function ticketmasterGet(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('apikey', config.ticketmasterKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }

  const res = await fetch(url);

  if (res.status === 404) return null;
  if (res.status === 401) throw new AppError(502, 'Ticketmaster rejected the API key (check server/.env)');
  if (res.status === 429) throw new AppError(503, 'Ticketmaster rate limit hit, try again in a moment');
  if (!res.ok) throw new AppError(502, `Ticketmaster error (${res.status})`);

  return res.json();
}

// Ticketmaster events are huge objects. Keep only what our app needs.
function toEvent(raw) {
  const venue = raw._embedded?.venues?.[0];
  const date = raw.dates?.start?.localDate || null; // '2026-10-03'
  const time = raw.dates?.start?.localTime || null; // '19:30:00'

  // Pick the widest image for the card
  const image = [...(raw.images || [])].sort((a, b) => b.width - a.width)[0];

  return {
    id: raw.id,
    title: raw.name,
    venue: venue?.name || 'Venue TBA',
    city: venue?.city?.name || '',
    date,
    time,
    // Ready-to-show text, so the frontend doesn't format anything
    displayDate: date ? formatDisplayDate(date) : 'Date TBA',
    displayTime: formatDisplayTime(time),
    imageUrl: image?.url || null,
    ticketUrl: raw.url || null,
  };
}

// All events in a city for one month ('YYYY-MM')
export async function fetchMonthEvents(city, month) {
  const cacheKey = `month:${city.toLowerCase()}:${month}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await ticketmasterGet('/events.json', {
    city,
    startDateTime: `${month}-01T00:00:00Z`,
    endDateTime: `${month}-${daysInMonth(month)}T23:59:59Z`,
    sort: 'date,asc',
    size: 200, // the biggest page Ticketmaster allows
  });

  const events = (data?._embedded?.events || [])
    .map(toEvent)
    // Keep only events whose local date is really inside this month
    .filter((event) => event.date && event.date.startsWith(month));

  setCached(cacheKey, events, CACHE_TTL_MS);
  return events;
}

// One event by its Ticketmaster id
export async function fetchEventById(eventId) {
  const cacheKey = `event:${eventId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const raw = await ticketmasterGet(`/events/${encodeURIComponent(eventId)}.json`);
  if (!raw) throw new AppError(404, 'Event not found');

  const event = toEvent(raw);
  setCached(cacheKey, event, CACHE_TTL_MS);
  return event;
}
