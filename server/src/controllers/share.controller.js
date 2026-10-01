import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateEventId, validateObjectId, isValidShareCode } from '../utils/validators.js';
import { createShareLink, recordClick } from '../services/share.service.js';

const VISITOR_COOKIE = 'visitor_id';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// POST /api/share   body: { userId, eventId }
export const createLink = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const userId = validateObjectId(body.userId, 'userId');
  const eventId = validateEventId(body.eventId);

  const link = await createShareLink(userId, eventId);
  res.status(201).json(link);
});

// GET /s/:code   (a friend clicked a share link)
export const openLink = asyncHandler(async (req, res) => {
  const { code } = req.params;

  // Bad-looking code? Just send them to the home page.
  if (!isValidShareCode(code)) return res.redirect(config.clientUrl);

  // Give each browser a random id stored in a cookie,
  // so the same friend clicking twice only counts once
  let visitorId = req.cookies[VISITOR_COOKIE];
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie(VISITOR_COOKIE, visitorId, { httpOnly: true, sameSite: 'lax', maxAge: ONE_YEAR_MS });
  }

  const eventId = await recordClick(code, visitorId);

  // Send the friend to the React app, opened on the shared event
  const target = eventId
    ? `${config.clientUrl}/?event=${encodeURIComponent(eventId)}`
    : config.clientUrl;
  res.redirect(target);
});
