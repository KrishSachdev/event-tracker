// The main page: wires the hooks and components together.
// It holds UI state (selected city/month/day) but no business logic.
import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client.js';
import { useUser } from './hooks/useUser.js';
import { useEvents } from './hooks/useEvents.js';
import { useLiveUpdates } from './hooks/useLiveUpdates.js';
import LoginForm from './components/LoginForm.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import CitySearch from './components/CitySearch.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import EventCalendar from './components/EventCalendar.jsx';
import EventCard from './components/EventCard.jsx';
import EventList from './components/EventList.jsx';

// If the page was opened from a share link, the URL looks like /?event=<id>
const invitedEventId = new URLSearchParams(window.location.search).get('event');

export default function App() {
  const { user, loading: userLoading, login, updateProfile, logout } = useUser();

  if (userLoading) return <p className="muted center">Loading...</p>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Event Tracker</h1>
        {user && <span className="muted">Hi, {user.name}</span>}
      </header>

      {user ? (
        // `key` resets the page state when a different user signs in
        <EventsPage key={user.id} user={user} onSaveProfile={updateProfile} onLogout={logout} />
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  );
}

function EventsPage({ user, onSaveProfile, onLogout }) {
  // '' and null mean "let the server pick the default"
  const [city, setCity] = useState(user.city || '');
  const [month, setMonth] = useState(null);
  const [category, setCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [notice, setNotice] = useState('');
  const [invitedEvent, setInvitedEvent] = useState(null);

  const { calendar, events, loading, error, reload, setFriendsCount } = useEvents({
    city,
    month,
    date: selectedDate,
    category,
    userId: user.id,
  });

  // Load the event from the share link (if any)
  const loadInvitedEvent = useCallback(() => {
    if (!invitedEventId) return;
    api
      .getEvent(invitedEventId, user.id)
      .then((data) => setInvitedEvent(data.event))
      .catch(() => setInvitedEvent(null));
  }, [user.id]);

  useEffect(() => loadInvitedEvent(), [loadInvitedEvent]);

  // After any change, refresh what's on screen
  function refresh() {
    reload(false);
    loadInvitedEvent();
  }

  // Live updates pushed by the server
  const isLive = useLiveUpdates(user.id, {
    // A friend clicked a share link: show the new count right away
    onFriendsUpdated: ({ eventId, friendsAttending }) => {
      setFriendsCount(eventId, friendsAttending);
      setInvitedEvent((current) =>
        current && current.id === eventId ? { ...current, friendsAttending } : current
      );
    },
    // This user's RSVPs changed somewhere else (another tab, or the chat)
    onRsvpUpdated: () => refresh(),
  });

  async function handleToggleInterest(event) {
    try {
      if (event.isInterested) {
        await api.removeRsvp(user.id, event.id);
        setNotice(`Removed "${event.title}" from your events`);
      } else {
        await api.addRsvp(user.id, event.id);
        setNotice(`You're interested in "${event.title}". You can now share it with friends.`);
      }
      refresh();
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function handleShare(event) {
    try {
      const link = await api.createShareLink(user.id, event.id);
      // Copy to clipboard (can fail on non-https pages, so it's optional)
      await navigator.clipboard?.writeText(link.shareUrl).catch(() => {});
      setNotice(`Share link copied: ${link.shareUrl}`);
      refresh();
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function handleSaveProfile(updates) {
    await onSaveProfile(updates);
    if (updates.city !== undefined) setCity(updates.city);
  }

  function handleSearch(newCity) {
    setCity(newCity);
    setSelectedDate(null);
  }

  function handleChangeCategory(newCategory) {
    setCategory(newCategory);
    setSelectedDate(null);
  }

  function handleChangeMonth(newMonth) {
    setMonth(newMonth);
    setSelectedDate(null);
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <CitySearch city={city || calendar?.city || ''} onSearch={handleSearch} />
        <CategoryFilter value={category || calendar?.category || ''} onChange={handleChangeCategory} />
        <EventCalendar
          calendar={calendar}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={handleChangeMonth}
        />
        <ProfilePanel user={user} onSave={handleSaveProfile} onLogout={onLogout} />
      </aside>

      <main className="content">
        <p className={isLive ? 'live-status on' : 'live-status'}>
          {isLive ? '● Live updates on' : '○ Connecting to live updates...'}
        </p>

        {notice && (
          <p className="notice" onClick={() => setNotice('')}>{notice} <span className="muted">(click to hide)</span></p>
        )}
        {error && <p className="error">{error}</p>}

        {invitedEvent && (
          <section>
            <h2>You were invited to</h2>
            <EventCard event={invitedEvent} highlight onToggleInterest={handleToggleInterest} onShare={handleShare} />
          </section>
        )}

        <h2>{selectedDate ? `Events on ${selectedDate}` : `Events in ${calendar?.monthLabel || ''}`}</h2>
        <EventList
          events={events}
          loading={loading}
          onToggleInterest={handleToggleInterest}
          onShare={handleShare}
        />
      </main>
    </div>
  );
}
