import { asyncHandler } from '../utils/asyncHandler.js';
import { validateObjectId } from '../utils/validators.js';
import { requireUser } from '../services/user.service.js';
import { openStream } from '../services/realtime.service.js';

// GET /api/stream?userId=...
// Keeps the connection open and pushes live updates to the browser
export const stream = asyncHandler(async (req, res) => {
  const userId = validateObjectId(req.query.userId, 'Your account');
  await requireUser(userId);
  openStream(userId, res);
});
