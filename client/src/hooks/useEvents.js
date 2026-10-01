// Loads the calendar and the event list, and refreshes them every 30 seconds
// so "Friends attending" counts stay up to date.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const REFRESH_EVERY_MS = 30 * 1000;

export function useEvents({ city, month, date, userId }) {
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
          api.getCalendar(city, month),
          api.getEvents(city, month, date, userId),
        ]);
        setCalendar(calendarData);
        setEvents(eventData.events);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [city, month, date, userId]
  );

  // Load now, then every 30 seconds. Stop the timer when inputs change or the page closes.
  useEffect(() => {
    load();
    const timer = setInterval(() => load(false), REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { calendar, events, loading, error, reload: load };
}
