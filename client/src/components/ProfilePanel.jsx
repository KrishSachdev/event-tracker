// Edit name, home city, and reminder settings
import { useState } from 'react';

export default function ProfilePanel({ user, onSave, onLogout }) {
  // Local copies of the fields while the user is typing
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(user.city);
  const [remindersOn, setRemindersOn] = useState(user.reminders.enabled);
  const [hoursBefore, setHoursBefore] = useState(user.reminders.hoursBefore);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // The server checks every value (e.g. hoursBefore must be 1-168)
      await onSave({
        name,
        city,
        reminders: { enabled: remindersOn, hoursBefore: Number(hoursBefore) },
      });
      setIsError(false);
      setMessage('Saved');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <form className="panel profile" onSubmit={handleSubmit}>
      <h2>Profile</h2>
      <p className="muted">{user.email}</p>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Home city
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </label>

      <label className="checkbox">
        <input type="checkbox" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} />
        Event reminders
      </label>
      <label>
        Remind me (hours before)
        <input
          type="number"
          value={hoursBefore}
          disabled={!remindersOn}
          onChange={(e) => setHoursBefore(e.target.value)}
        />
      </label>

      {message && <p className={isError ? 'error' : 'success'}>{message}</p>}

      <div className="actions">
        <button className="btn">Save</button>
        <button type="button" className="btn secondary" onClick={onLogout}>Sign out</button>
      </div>
    </form>
  );
}
