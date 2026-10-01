// Friend Invite logic: creating share links, counting clicks, and "Friends Attending"
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { Rsvp } from '../models/Rsvp.js';
import { ShareLink } from '../models/ShareLink.js';
import { broadcast } from './realtime.service.js';

// The full URL a user copies and sends to friends
export function buildShareUrl(code) {
  return `${config.serverUrl}/s/${code}`;
}

// Creates (or returns the existing) share link for a user + event
export async function createShareLink(userId, eventId) {
  // Rule: you can only share an event you RSVP'd to
  const rsvp = await Rsvp.findOne({ user: userId, eventId });
  if (!rsvp) throw new AppError(403, 'RSVP to this event before sharing it');

  // Reuse the user's existing link, so each user has one link per event
  let link = await ShareLink.findOne({ user: userId, eventId });

  if (!link) {
    // 6 random bytes -> an 8-character URL-safe code like 'k3J9_xQa'
    const code = crypto.randomBytes(6).toString('base64url');
    link = await ShareLink.create({ code, user: userId, eventId });
  }

  return {
    code: link.code,
    shareUrl: buildShareUrl(link.code),
    clicks: link.clickedBy.length,
  };
}

// Called when someone opens /s/<code>.
// Saves the click and returns the event id to send them to (or null if the code is unknown).
export async function recordClick(code, visitorId) {
  // $addToSet only adds the visitor id if it isn't already in the list,
  // so clicking the same link twice from one browser still counts as 1
  const link = await ShareLink.findOneAndUpdate(
    { code },
    { $addToSet: { clickedBy: visitorId } },
    { new: true }
  );
  if (!link) return null;

  // Tell every open browser the new count, so cards update instantly
  await notifyFriendsCount(link.eventId);
  return link.eventId;
}

// For a list of event ids, returns { eventId: friendsAttendingCount }.
// The count = unique people who clicked ANY share link for that event.
export async function getFriendsAttendingCounts(eventIds) {
  const rows = await ShareLink.aggregate([
    // Only links for the events we care about
    { $match: { eventId: { $in: eventIds } } },
    // One row per click
    { $unwind: '$clickedBy' },
    // Group by event and collect the unique visitor ids
    { $group: { _id: '$eventId', visitors: { $addToSet: '$clickedBy' } } },
    // Count them
    { $project: { count: { $size: '$visitors' } } },
  ]);

  // [{ _id: 'abc', count: 3 }] -> { abc: 3 }
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

// Recounts friends for one event and pushes the new number to every connected browser
export async function notifyFriendsCount(eventId) {
  const counts = await getFriendsAttendingCounts([eventId]);
  broadcast('friends-updated', { eventId, friendsAttending: counts[eventId] || 0 });
}
