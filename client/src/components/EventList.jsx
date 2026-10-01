// A list of EventCards, plus loading / empty states
import EventCard from './EventCard.jsx';

export default function EventList({ events, loading, onToggleInterest, onShare }) {
  if (loading) return <p className="muted">Loading events...</p>;
  if (events.length === 0) return <p className="muted">No events found. Try another city or month.</p>;

  return (
    <div className="event-list">
      {events.map((event) => (
        <EventCard key={event.id} event={event} onToggleInterest={onToggleInterest} onShare={onShare} />
      ))}
    </div>
  );
}
