// Combines Ticketmaster events with our own data (RSVPs, share links, friend counts)
import { Rsvp } from '../models/Rsvp.js';
import { ShareLink } from '../models/ShareLink.js';
import { fetchMonthEvents, fetchEventById } from './ticketmaster.service.js';
import { buildShareUrl, getFriendsAttendingCounts } from './share.service.js';
import { buildMonthGrid, formatMonthLabel, shiftMonth } from '../utils/dates.js';

// Adds to each event:
//   friendsAttending - how many friends clicked share links for it
//   isInterested     - did THIS user RSVP?
//   shareUrl         - this user's share link, if they made one
async function attachUserData(events, userId) {
  if (events.length === 0) return [];

  const eventIds = events.map((event) => event.id);
  const friendCounts = await getFriendsAttendingCounts(eventIds);

  let rsvpEventIds = new Set();
  let shareUrls = new Map();

  if (userId) {
    // Which of these events has the user RSVP'd to?
    const rsvps = await Rsvp.find({ user: userId, eventId: { $in: eventIds } }).select('eventId');
    rsvpEventIds = new Set(rsvps.map((r) => r.eventId));

    // Which of these events has the user made a share link for?
    const links = await ShareLink.find({ user: userId, eventId: { $in: eventIds } }).select('eventId code');
    shareUrls = new Map(links.map((link) => [link.eventId, buildShareUrl(link.code)]));
  }

  return events.map((event) => ({
    ...event,
    friendsAttending: friendCounts[event.id] || 0,
    isInterested: rsvpEventIds.has(event.id),
    shareUrl: shareUrls.get(event.id) || null,
  }));
}

// Events for a month, or for one day if `date` is given
export async function getEvents({ city, month, date, userId }) {
  const monthEvents = await fetchMonthEvents(city, month);
  const events = date ? monthEvents.filter((event) => event.date === date) : monthEvents;
  return attachUserData(events, userId);
}

// Everything the calendar needs: the grid, the label, and prev/next month
export async function getCalendar({ city, month }) {
  const events = await fetchMonthEvents(city, month);

  // Count events per day: { '2026-10-03': 4, ... }
  const countsByDate = {};
  for (const event of events) {
    countsByDate[event.date] = (countsByDate[event.date] || 0) + 1;
  }

  return {
    city,
    month,
    monthLabel: formatMonthLabel(month),
    prevMonth: shiftMonth(month, -1),
    nextMonth: shiftMonth(month, 1),
    totalEvents: events.length,
    weeks: buildMonthGrid(month, countsByDate),
  };
}

// A single event (used when a friend opens a share link)
export async function getEventById(eventId, userId) {
  const event = await fetchEventById(eventId);
  const [withUserData] = await attachUserData([event], userId);
  return withUserData;
}
