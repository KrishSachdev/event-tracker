// Real-time updates using Server-Sent Events (SSE).
// Each open browser tab keeps one HTTP connection open, and the server writes messages into it
// whenever something changes (a friend clicks a share link, an RSVP changes, ...).
//
// Note: connections live in this server's memory. If you ever run several servers,
// use a shared message bus (e.g. Redis pub/sub) so every server hears every update.

const KEEP_ALIVE_MS = 25 * 1000;

// userId -> Set of open connections (Express response objects), one per browser tab
const connections = new Map();

// Starts an SSE connection for one browser tab
export function openStream(userId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n'); // lines starting with ':' are comments; the browser ignores them

  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(res);

  // Send a comment every 25 seconds so nothing in between closes an idle connection
  const keepAlive = setInterval(() => res.write(': ping\n\n'), KEEP_ALIVE_MS);

  // Tab closed or connection lost: clean up
  res.on('close', () => {
    clearInterval(keepAlive);
    const userConnections = connections.get(userId);
    if (!userConnections) return;
    userConnections.delete(res);
    if (userConnections.size === 0) connections.delete(userId);
  });
}

// One SSE message looks like:  event: friends-updated\ndata: {"eventId":"abc"}\n\n
function send(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Send to every connected user (e.g. a friends count changed)
export function broadcast(eventName, data) {
  for (const userConnections of connections.values()) {
    for (const res of userConnections) send(res, eventName, data);
  }
}

// Send to every open tab of one user (e.g. their RSVP changed in another tab or in the chat)
export function sendToUser(userId, eventName, data) {
  for (const res of connections.get(String(userId)) || []) send(res, eventName, data);
}
