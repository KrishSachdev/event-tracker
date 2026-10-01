// One event inside a chat reply (a smaller version of EventCard)
export default function ChatEventItem({ event, number }) {
  return (
    <div className="chat-event">
      <div className="chat-event-number">{number}</div>
      <div>
        <strong>{event.title}</strong>
        <p className="meta">{event.displayDate} · {event.displayTime}</p>
        <p className="meta">{event.venue}{event.city ? `, ${event.city}` : ''}</p>
        <p className="meta">
          Friends attending: {event.friendsAttending}
          {event.isInterested && <span className="chat-event-tag">★ Interested</span>}
        </p>
      </div>
    </div>
  );
}
