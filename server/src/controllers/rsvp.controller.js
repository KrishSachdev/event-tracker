import { asyncHandler } from '../utils/asyncHandler.js';
import { validateEventId, validateObjectId } from '../utils/validators.js';
import { addRsvp, removeRsvp } from '../services/rsvp.service.js';

// POST /api/rsvps   body: { userId, eventId }
export const createRsvp = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const userId = validateObjectId(body.userId, 'userId');
  const eventId = validateEventId(body.eventId);

  const rsvp = await addRsvp(userId, eventId);
  res.status(201).json({ rsvp });
});

// DELETE /api/rsvps/:eventId?userId=...
export const deleteRsvp = asyncHandler(async (req, res) => {
  const userId = validateObjectId(req.query.userId, 'userId');
  const eventId = validateEventId(req.params.eventId);

  await removeRsvp(userId, eventId);
  res.json({ ok: true });
});
