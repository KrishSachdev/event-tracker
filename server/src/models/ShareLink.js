import mongoose from 'mongoose';

// A "Friend Invite" link that a user creates for an event they RSVP'd to
const shareLinkSchema = new mongoose.Schema(
  {
    // Short random code used in the URL: /s/<code>
    code: { type: String, required: true, unique: true },
    // Who created the link
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Which Ticketmaster event it points to
    eventId: { type: String, required: true, index: true },

    // Ids of the browsers that clicked the link.
    // Storing ids (not a plain number) means the same person clicking twice counts once.
    clickedBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One share link per user per event
shareLinkSchema.index({ user: 1, eventId: 1 }, { unique: true });

export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
