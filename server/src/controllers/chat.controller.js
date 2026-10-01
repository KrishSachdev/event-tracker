import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { requireString, validateObjectId } from '../utils/validators.js';
import { chat } from '../services/chat.service.js';

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 20;
const MAX_TURN_LENGTH = 4000;

// Checks the earlier messages sent by the browser and keeps only the most recent ones
function readHistory(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new AppError(400, 'Chat history is not valid');

  const history = value.slice(-MAX_HISTORY_TURNS).map((turn) => {
    const roleOk = turn && (turn.role === 'user' || turn.role === 'assistant');
    const textOk = turn && typeof turn.text === 'string' && turn.text.length <= MAX_TURN_LENGTH;
    if (!roleOk || !textOk) throw new AppError(400, 'Chat history is not valid');
    return { role: turn.role, text: turn.text };
  });

  // A conversation must start with the user, so drop any leading assistant messages
  while (history.length > 0 && history[0].role === 'assistant') history.shift();
  return history;
}

// POST /api/chat   body: { userId, message, history? }
export const sendMessage = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const userId = validateObjectId(body.userId, 'Your account');
  const message = requireString(body.message, 'Message', MAX_MESSAGE_LENGTH);
  const history = readHistory(body.history);

  res.json(await chat({ userId, message, history }));
});
