// Floating chat window for the AI assistant.
// It only sends messages and shows replies; the server (and Gemini) does all the thinking.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import ChatEventItem from './ChatEventItem.jsx';

const SUGGESTIONS = [
  'Music events in London this weekend',
  'Sports in New York next week',
  'What am I interested in?',
];

const WELCOME = {
  role: 'assistant',
  text: 'Hi! Ask me about events, or tell me to RSVP or share one.',
  isWelcome: true, // not sent to the server as history
};

export default function ChatPanel({ userId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send(text) {
    const message = text.trim();
    if (!message || sending) return;

    // Earlier messages, so the assistant remembers the conversation.
    // `historyText` comes from the server (it includes event ids for follow-ups like "RSVP to #2").
    const history = messages
      .filter((m) => !m.isWelcome)
      .map((m) => ({ role: m.role, text: m.historyText || m.text }));

    setMessages((current) => [...current, { role: 'user', text: message }]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const data = await api.chat(userId, message, history);
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: data.reply, historyText: data.historyText, events: data.events },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  if (!open) {
    return (
      <button className="chat-toggle btn" onClick={() => setOpen(true)}>
        Ask the assistant
      </button>
    );
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <strong>Event assistant</strong>
        <button className="link-button" onClick={() => setOpen(false)}>Close</button>
      </header>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.role}`}>
            <p>{m.text}</p>
            {m.events?.map((event, n) => (
              <ChatEventItem key={event.id} event={event} number={n + 1} />
            ))}
          </div>
        ))}

        {/* Starter ideas, shown until the user sends something */}
        {messages.length === 1 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn secondary" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {sending && <p className="muted">Thinking...</p>}
        {error && <p className="error">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Comedy in Chicago on Friday"
          maxLength={500}
          disabled={sending}
        />
        <button className="btn" disabled={sending || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
