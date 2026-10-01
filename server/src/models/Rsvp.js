import mongoose from 'mongoose';

// One document = "this user is interested in this event"
const rsvpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The Ticketmaster event id
    eventId: { type: String, required: true, index: true },

    // A copy of the main event details, so we don't need Ticketmaster to show them later
    eventName: { type: String, default: '' },
    eventDate: { type: String, default: '' }, // 'YYYY-MM-DD'
    venue: { type: String, default: '' },
  },
  { timestamps: true }
);

// A user can RSVP to the same event only once
rsvpSchema.index({ user: 1, eventId: 1 }, { unique: true });

export const Rsvp = mongoose.model('Rsvp', rsvpSchema);
