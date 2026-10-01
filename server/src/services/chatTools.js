// The "tools" the chat assistant is allowed to use.
// Gemini only picks a tool and its arguments; the code below does the work, using the same
// services (and the same validation) as the rest of the app.
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { validateDate, validateEventId } from '../utils/validators.js';
import { todayString, addDays, endOfMonth } from '../utils/dates.js';
import { CATEGORIES, DEFAULT_CATEGORY, fetchEventById } from './ticketmaster.service.js';
import { searchEvents } from './event.service.js';
import { addRsvp, removeRsvp, listUpcomingRsvps } from './rsvp.service.js';
import { createShareLink } from './share.service.js';

const MAX_RESULTS = 8;       // events shown per answer
const MAX_RANGE_DAYS = 62;   // longest date range one search may cover

// ---------- Descriptions Gemini reads to decide which tool to call ----------

export const toolDeclarations = [
  {
    name: 'search_events',
    description: 'Find events in a city between two dates. Use for any question about what is on.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: "City name, e.g. 'London'. Leave out to use the user's city." },
        startDate: { type: 'string', description: 'First day, YYYY-MM-DD. Leave out for today.' },
        endDate: { type: 'string', description: 'Last day, YYYY-MM-DD. Leave out for the end of that month.' },
        category: {
          type: 'string',
          enum: CATEGORIES.map((c) => c.id),
          description: 'Type of event. Use "all" when the user does not say.',
        },
        keyword: { type: 'string', description: 'Optional word to match in the event title or venue, e.g. an artist.' },
      },
    },
  },
  {
    name: 'get_my_events',
    description: "List the user's upcoming events they marked as Interested (their RSVPs).",
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'rsvp_event',
    description: 'Mark the user as Interested in an event (RSVP). Only when the user asks.',
    parametersJsonSchema: {
      type: 'object',
      properties: { eventId: { type: 'string', description: 'The eventId from a search result.' } },
      required: ['eventId'],
    },
  },
  {
    name: 'cancel_rsvp',
    description: "Remove the user's RSVP for an event. Only when the user asks.",
    parametersJsonSchema: {
      type: 'object',
      properties: { eventId: { type: 'string' } },
      required: ['eventId'],
    },
  },
  {
    name: 'create_share_link',
    description: 'Create a Friend Invite share link for an event the user has RSVPd to.',
    parametersJsonSchema: {
      type: 'object',
      properties: { eventId: { type: 'string' } },
      required: ['eventId'],
    },
  },
];

// ---------- What each tool actually does ----------
// Each one gets the arguments from Gemini plus `context` ({ user, shownEvents }).
// Whatever it returns is sent back to Gemini as the result.

// Short version of an event for Gemini to read
const summarize = (event, index) => ({
  number: index + 1,
  eventId: event.id,
  title: event.title,
  date: event.displayDate,
  time: event.displayTime,
  venue: event.venue,
});

async function searchEventsTool(args, context) {
  const city = args.city?.trim() || context.user.city || config.defaultCity;
  const startDate = args.startDate ? validateDate(args.startDate) : todayString();
  let endDate = args.endDate ? validateDate(args.endDate) : endOfMonth(startDate);

  if (endDate < startDate) throw new AppError(400, 'endDate is before startDate');
  // Keep searches small (each month costs Ticketmaster calls)
  if (endDate > addDays(startDate, MAX_RANGE_DAYS)) endDate = addDays(startDate, MAX_RANGE_DAYS);

  const category = CATEGORIES.some((c) => c.id === args.category) ? args.category : DEFAULT_CATEGORY;

  const found = await searchEvents({ city, startDate, endDate, category, keyword: args.keyword });
  const shown = found.slice(0, MAX_RESULTS);
  context.shownEvents = shown; // these become event cards under the reply

  return {
    city,
    startDate,
    endDate,
    category,
    totalFound: found.length,
    showing: shown.length,
    events: shown.map(summarize),
  };
}

async function getMyEventsTool(args, context) {
  const rsvps = await listUpcomingRsvps(context.user.id);

  // Load full event details for the cards (cached, so usually no Ticketmaster call)
  const events = [];
  for (const rsvp of rsvps.slice(0, MAX_RESULTS)) {
    try {
      events.push(await fetchEventById(rsvp.eventId));
    } catch {
      // Event removed from Ticketmaster: skip it
    }
  }
  context.shownEvents = events;

  return { totalUpcoming: rsvps.length, events: events.map(summarize) };
}

async function rsvpEventTool(args, context) {
  const eventId = validateEventId(args.eventId);
  const rsvp = await addRsvp(context.user.id, eventId);
  context.shownEvents = [await fetchEventById(eventId)];
  return { done: true, title: rsvp.eventName };
}

async function cancelRsvpTool(args, context) {
  const eventId = validateEventId(args.eventId);
  await removeRsvp(context.user.id, eventId);
  context.shownEvents = [await fetchEventById(eventId)];
  return { done: true };
}

async function createShareLinkTool(args, context) {
  const eventId = validateEventId(args.eventId);
  const link = await createShareLink(context.user.id, eventId);
  context.shownEvents = [await fetchEventById(eventId)];
  return { shareUrl: link.shareUrl, friendsWhoClicked: link.clicks };
}

const tools = {
  search_events: searchEventsTool,
  get_my_events: getMyEventsTool,
  rsvp_event: rsvpEventTool,
  cancel_rsvp: cancelRsvpTool,
  create_share_link: createShareLinkTool,
};

// Runs one tool. Problems (bad date, no RSVP, ...) go back to Gemini as { error },
// so it can explain them to the user or try again.
export async function runTool(name, args, context) {
  const tool = tools[name];
  if (!tool) return { error: `Unknown tool ${name}` };

  try {
    return await tool(args || {}, context);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error(`Chat tool ${name} failed:`, err);
    return { error: 'Something went wrong while doing that' };
  }
}
