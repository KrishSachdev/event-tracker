// Every call to the backend goes through this file.
// Components never call fetch() directly.

// Sends a request to /api/... and returns the JSON, or throws the server's error message
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// { city: 'London', month: null } -> 'city=London'  (skips empty values)
function toQuery(params) {
  const clean = Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== '');
  return new URLSearchParams(clean).toString();
}

export const api = {
  // Events
  getCategories: () => request('/events/categories'),
  getCalendar: (city, month, category) => request(`/events/calendar?${toQuery({ city, month, category })}`),
  getEvents: (city, month, date, category, userId) =>
    request(`/events?${toQuery({ city, month, date, category, userId })}`),
  getEvent: (eventId, userId) => request(`/events/${encodeURIComponent(eventId)}?${toQuery({ userId })}`),

  // Users
  login: (name, email, city) => request('/users', { method: 'POST', body: { name, email, city } }),
  getUser: (userId) => request(`/users/${userId}`),
  updateUser: (userId, updates) => request(`/users/${userId}`, { method: 'PATCH', body: updates }),

  // RSVPs ("Interested")
  addRsvp: (userId, eventId) => request('/rsvps', { method: 'POST', body: { userId, eventId } }),
  removeRsvp: (userId, eventId) =>
    request(`/rsvps/${encodeURIComponent(eventId)}?${toQuery({ userId })}`, { method: 'DELETE' }),

  // Friend Invite
  createShareLink: (userId, eventId) => request('/share', { method: 'POST', body: { userId, eventId } }),
};
