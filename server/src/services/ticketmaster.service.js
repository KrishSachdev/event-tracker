// Talks to the Ticketmaster Discovery API and turns its responses into our simple event shape
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { getCached, setCached } from '../utils/cache.js';
import { daysInMonth, formatDisplayDate, formatDisplayTime } from '../utils/dates.js';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // keep results for 5 minutes

// Ticketmaster returns at most 200 events per page and 1000 events in total (page * size < 1000)
const PAGE_SIZE = 200;
const MAX_PAGES = 5;

// Categories the user can pick. `segment` is Ticketmaster's segment name (null = no filter).
export const CATEGORIES = [
  { id: 'all', label: 'All events', segment: null },
  { id: 'music', label: 'Music', segment: 'Music' },
  { id: 'sports', label: 'Sports', segment: 'Sports' },
  { id: 'arts', label: 'Arts & Theatre', segment: 'Arts & Theatre' },
  { id: 'film', label: 'Film', segment: 'Film' },
  { id: 'other', label: 'Attractions & other', segment: 'Miscellaneous' },
];

export const DEFAULT_CATEGORY = 'all';

// Wait between page requests so we stay under Ticketmaster's 5 calls per second
const DELAY_BETWEEN_PAGES_MS = 250;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Requests that are running right now, by cache key.
// The calendar and the event list ask for the same month at the same moment;
// this makes the second one wait for the first instead of calling Ticketmaster again.
const inFlight = new Map();

// 'music' -> 'Music'
function segmentFor(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId)?.segment || null;
}

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

// All events in a city for one month ('YYYY-MM'), optionally for one category
export async function fetchMonthEvents(city, month, category = DEFAULT_CATEGORY) {
  const cacheKey = `month:${city.toLowerCase()}:${month}:${category}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Same request already running? Share its result.
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const request = loadMonthEvents(city, month, category)
    .then((events) => {
      setCached(cacheKey, events, CACHE_TTL_MS);
      return events;
    })
    .finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, request);
  return request;
}

// Does the actual Ticketmaster calls for fetchMonthEvents
async function loadMonthEvents(city, month, category) {
  // Busy cities have more than 200 events a month, so keep asking for the next page
  // until there are no more pages, or we hit Ticketmaster's 1000-event limit
  const rawEvents = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await ticketmasterGet('/events.json', {
      city,
      segmentName: segmentFor(category) || undefined,
      startDateTime: `${month}-01T00:00:00Z`,
      endDateTime: `${month}-${daysInMonth(month)}T23:59:59Z`,
      sort: 'date,asc',
      size: PAGE_SIZE,
      page,
    });

    rawEvents.push(...(data?._embedded?.events || []));

    const totalPages = data?.page?.totalPages || 0;
    if (page + 1 >= totalPages) break; // that was the last page

    await wait(DELAY_BETWEEN_PAGES_MS);
  }

  const events = rawEvents
    .map(toEvent)
    // Keep only events whose local date is really inside this month
    .filter((event) => event.date && event.date.startsWith(month));

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
