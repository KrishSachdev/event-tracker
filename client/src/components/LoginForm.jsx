// Sign-in / sign-up form. Same form for both: the server creates the user if the email is new.
import { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setBusy(true);
    setError('');
    try {
      await onLogin(name, email, city);
    } catch (err) {
      setError(err.message); // e.g. "email is not valid" from the server
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel login-form" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      <p className="muted">New email? We'll create your profile.</p>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Home city (optional)
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. London" />
      </label>

      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Continue'}</button>
    </form>
  );
}
