// A tiny in-memory cache with an expiry time.
// Ticketmaster's free tier allows 5000 calls/day and 5 per second,
// so we reuse recent results instead of calling it on every request.

const store = new Map();

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;

  // Expired? Remove it and act as if it was never there
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
