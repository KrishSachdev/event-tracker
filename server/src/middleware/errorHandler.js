// Runs when no route matched the request
export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Runs whenever any route throws an error. Turns it into a clean JSON response.
// (Express knows this is an error handler because it has 4 parameters.)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Bad JSON in the request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  // Mongoose couldn't convert an id (e.g. /api/users/abc)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' });
  }
  // Mongoose schema rule failed (e.g. hoursBefore > 168)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  // MongoDB unique index was violated
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Already exists' });
  }

  const status = err.status || 500;

  // Unexpected errors: log the details, but don't leak them to the user
  if (status === 500) console.error(err);

  res.status(status).json({ error: status === 500 ? 'Something went wrong' : err.message });
}
