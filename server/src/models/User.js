import mongoose from 'mongoose';

// A user's profile and their event reminder settings
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Email is how a user "signs in" in this simple version, so it must be unique
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Their home city, used as the default city for event search
    city: { type: String, default: '', trim: true },

    // Event reminder settings
    reminders: {
      enabled: { type: Boolean, default: true },
      // Remind this many hours before an event (1 hour to 7 days)
      hoursBefore: { type: Number, default: 24, min: 1, max: 168 },
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

export const User = mongoose.model('User', userSchema);
