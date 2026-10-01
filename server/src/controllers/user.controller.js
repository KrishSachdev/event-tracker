import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import {
  requireString,
  optionalString,
  validateEmail,
  validateObjectId,
  validateBoolean,
  validateIntInRange,
} from '../utils/validators.js';
import { loginOrRegister, getUser, updateUser } from '../services/user.service.js';

// POST /api/users   body: { name, email, city }
export const login = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = requireString(body.name, 'Name', 60);
  const email = validateEmail(body.email);
  const city = optionalString(body.city, 'City', 60);

  const user = await loginOrRegister({ name, email, city });
  res.json({ user });
});

// GET /api/users/:id
export const getProfile = asyncHandler(async (req, res) => {
  const userId = validateObjectId(req.params.id, 'Your account');
  res.json({ user: await getUser(userId) });
});

// PATCH /api/users/:id   body: { name?, city?, reminders?: { enabled?, hoursBefore? } }
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = validateObjectId(req.params.id, 'Your account');
  const body = req.body || {};
  const updates = {};

  // Only update the fields that were sent
  if (body.name !== undefined) updates.name = requireString(body.name, 'Name', 60);
  if (body.city !== undefined) updates.city = optionalString(body.city, 'City', 60);

  if (body.reminders !== undefined) {
    if (typeof body.reminders !== 'object' || body.reminders === null) {
      throw new AppError(400, 'Reminder settings are not valid');
    }
    const { enabled, hoursBefore } = body.reminders;
    // Dot notation updates one nested field without wiping the others
    if (enabled !== undefined) {
      updates['reminders.enabled'] = validateBoolean(enabled, 'Event reminders');
    }
    if (hoursBefore !== undefined) {
      updates['reminders.hoursBefore'] = validateIntInRange(hoursBefore, 'Reminder hours', 1, 168);
    }
  }

  if (Object.keys(updates).length === 0) throw new AppError(400, 'No changes to save');

  res.json({ user: await updateUser(userId, updates) });
});
