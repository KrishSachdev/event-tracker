// Loads the calendar and the event list.
// Live changes (like friend counts) arrive through useLiveUpdates, so there's no polling.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useEvents({ city, month, date, category, userId }) {
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // showSpinner = false for background refreshes, so the page doesn't flicker
  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError('');
      try {
        // Ask for both at the same time
        const [calendarData, eventData] = await Promise.all([
          api.getCalendar(city, month, category),
          api.getEvents(city, month, date, category, userId),
        ]);
        setCalendar(calendarData);
        setEvents(eventData.events);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [city, month, date, category, userId]
  );

  // Load whenever the city, month, day, category or user changes
  useEffect(() => {
    load();
  }, [load]);

  // Put a new friends count (sent by the server) onto one event card
  const setFriendsCount = useCallback((eventId, friendsAttending) => {
    setEvents((current) =>
      current.map((event) => (event.id === eventId ? { ...event, friendsAttending } : event))
    );
  }, []);

  return { calendar, events, loading, error, reload: load, setFriendsCount };
}
