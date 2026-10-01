// One event: title, venue, date, time, Interested button, share link, friends count
import { useState } from 'react';

export default function EventCard({ event, onToggleInterest, onShare, highlight = false }) {
  const [busy, setBusy] = useState(false);

  // Disable the buttons while a request is running, so it can't be double-clicked
  async function run(action) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`event-card ${highlight ? 'highlight' : ''}`}>
      {event.imageUrl && <img src={event.imageUrl} alt="" loading="lazy" />}

      <div className="event-body">
        <h3>{event.title}</h3>
        <p className="meta">{event.venue}{event.city ? `, ${event.city}` : ''}</p>
        <p className="meta">{event.displayDate} · {event.displayTime}</p>
        <p className="friends">Friends attending: <strong>{event.friendsAttending}</strong></p>

        <div className="actions">
          <button
            className={event.isInterested ? 'btn active' : 'btn'}
            disabled={busy}
            onClick={() => run(() => onToggleInterest(event))}
          >
            {event.isInterested ? '★ Interested' : '☆ Interested'}
          </button>

          {/* Share is only offered after the user RSVPs (the server enforces this too) */}
          {event.isInterested && (
            <button className="btn secondary" disabled={busy} onClick={() => run(() => onShare(event))}>
              {event.shareUrl ? 'Copy share link' : 'Get share link'}
            </button>
          )}

          {event.ticketUrl && (
            <a className="btn secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">Tickets</a>
          )}
        </div>

        {event.shareUrl && (
          <input className="share-url" readOnly value={event.shareUrl} onFocus={(e) => e.target.select()} />
        )}
      </div>
    </article>
  );
}
