// User profile logic
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

// Only send safe, simple fields to the frontend
function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    city: user.city,
    reminders: {
      enabled: user.reminders.enabled,
      hoursBefore: user.reminders.hoursBefore,
    },
  };
}

// Simple sign-in: if the email exists, return that user; otherwise create a new one.
// (No passwords in this version, see README "Next steps".)
export async function loginOrRegister({ name, email, city }) {
  const existing = await User.findOne({ email });
  if (existing) return toPublicUser(existing);

  const created = await User.create({ name, email, city });
  return toPublicUser(created);
}

export async function getUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return toPublicUser(user);
}

// `updates` is already validated by the controller,
// e.g. { name: 'Krish', 'reminders.hoursBefore': 12 }
export async function updateUser(userId, updates) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true } // return the updated user, and apply schema rules
  );
  if (!user) throw new AppError(404, 'User not found');
  return toPublicUser(user);
}

// Throws 404 if the user doesn't exist
export async function requireUser(userId) {
  const exists = await User.exists({ _id: userId });
  if (!exists) throw new AppError(404, 'User not found');
}
