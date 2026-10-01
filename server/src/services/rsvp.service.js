// RSVP ("Interested") logic
import { AppError } from '../utils/AppError.js';
import { Rsvp } from '../models/Rsvp.js';
import { ShareLink } from '../models/ShareLink.js';
import { fetchEventById } from './ticketmaster.service.js';
import { requireUser } from './user.service.js';
import { notifyFriendsCount } from './share.service.js';
import { sendToUser } from './realtime.service.js';

function toPublicRsvp(rsvp) {
  return {
    eventId: rsvp.eventId,
    eventName: rsvp.eventName,
    eventDate: rsvp.eventDate,
    venue: rsvp.venue,
  };
}

// Mark the user as interested in an event
export async function addRsvp(userId, eventId) {
  await requireUser(userId);

  // If they already RSVP'd, just return it (clicking twice is harmless)
  const existing = await Rsvp.findOne({ user: userId, eventId });
  if (existing) return toPublicRsvp(existing);

  // Get the event from Ticketmaster ourselves, instead of trusting details sent by the browser.
  // This also checks that the event really exists.
  const event = await fetchEventById(eventId);

  const rsvp = await Rsvp.create({
    user: userId,
    eventId,
    eventName: event.title,
    eventDate: event.date,
    venue: event.venue,
  });

  // Update the user's other open tabs right away
  sendToUser(userId, 'rsvp-updated', { eventId });
  return toPublicRsvp(rsvp);
}

// Remove the user's interest in an event
export async function removeRsvp(userId, eventId) {
  const deleted = await Rsvp.findOneAndDelete({ user: userId, eventId });
  if (!deleted) throw new AppError(404, 'RSVP not found');

  // Sharing requires an RSVP, so their share link for this event goes too
  const { deletedCount } = await ShareLink.deleteOne({ user: userId, eventId });

  sendToUser(userId, 'rsvp-updated', { eventId });
  // The link's clicks no longer count, so everyone's friends count may have changed
  if (deletedCount > 0) await notifyFriendsCount(eventId);
}
