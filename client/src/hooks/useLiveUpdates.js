// Opens a live connection to the server (Server-Sent Events).
// The server pushes messages here the moment something changes; no polling needed.
// The browser reconnects automatically if the connection drops.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

export function useLiveUpdates(userId, { onFriendsUpdated, onRsvpUpdated }) {
  const [connected, setConnected] = useState(false);

  // Keep the latest callbacks in a ref, so changing them doesn't reconnect
  const handlers = useRef({ onFriendsUpdated, onRsvpUpdated });
  handlers.current = { onFriendsUpdated, onRsvpUpdated };

  useEffect(() => {
    if (!userId) return undefined;

    const source = api.openLiveStream(userId);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false); // the browser retries on its own

    // A friend clicked a share link: { eventId, friendsAttending }
    source.addEventListener('friends-updated', (e) => {
      handlers.current.onFriendsUpdated?.(JSON.parse(e.data));
    });

    // This user's RSVP changed (in another tab, or from the chat): { eventId }
    source.addEventListener('rsvp-updated', (e) => {
      handlers.current.onRsvpUpdated?.(JSON.parse(e.data));
    });

    // Close the connection when the user signs out or the page closes
    return () => source.close();
  }, [userId]);

  return connected;
}
