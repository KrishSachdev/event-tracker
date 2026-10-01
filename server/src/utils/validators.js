// Input checks used by the controllers.
// Each function returns the cleaned value, or throws a 400 error with a clear message.
// `label` is the human-readable name shown to the user (e.g. 'Name', 'Reminder hours'),
// never a code field name like 'reminders.hoursBefore'.
import mongoose from 'mongoose';
import { AppError } from './AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // 2026-10
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // 2026-10-03
const EVENT_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/; // Ticketmaster ids look like 'vvG1zZ9KbJ4h2b'
const SHARE_CODE_REGEX = /^[A-Za-z0-9_-]{6,20}$/;

// A non-empty string with a max length
export function requireString(value, label, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `${label} is required`);
  }
  if (value.trim().length > maxLength) {
    throw new AppError(400, `${label} must be at most ${maxLength} characters`);
  }
  return value.trim();
}

// Same as above, but empty is allowed (returns '')
export function optionalString(value, label, maxLength = 100) {
  if (value === undefined || value === null || value === '') return '';
  return requireString(value, label, maxLength);
}

export function validateEmail(value) {
  const email = requireString(value, 'Email', 254).toLowerCase();
  if (!EMAIL_REGEX.test(email)) throw new AppError(400, 'Please enter a valid email address');
  return email;
}

export function validateMonth(value) {
  if (!MONTH_REGEX.test(value)) throw new AppError(400, 'Month must be in the format YYYY-MM');
  return value;
}

export function validateDate(value) {
  if (!DATE_REGEX.test(value)) throw new AppError(400, 'Date must be in the format YYYY-MM-DD');
  return value;
}

export function validateEventId(value) {
  if (typeof value !== 'string' || !EVENT_ID_REGEX.test(value)) {
    throw new AppError(400, 'This event could not be found');
  }
  return value;
}

// Checks a MongoDB id (like a user id)
export function validateObjectId(value, label) {
  if (!mongoose.isValidObjectId(value)) throw new AppError(400, `${label} could not be found. Please sign in again.`);
  return String(value);
}

export function validateBoolean(value, label) {
  if (typeof value !== 'boolean') throw new AppError(400, `${label} must be on or off`);
  return value;
}

export function validateIntInRange(value, label, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AppError(400, `${label} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

// Returns true/false instead of throwing (share links just redirect home if invalid)
export function isValidShareCode(value) {
  return typeof value === 'string' && SHARE_CODE_REGEX.test(value);
}
