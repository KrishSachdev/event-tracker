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
    return res.status(400).json({ error: 'The request could not be read. Please try again.' });
  }
  // Mongoose couldn't convert an id (e.g. /api/users/abc)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'That item could not be found' });
  }
  // Mongoose schema rule failed. Its raw message contains code field names,
  // so send a plain message instead (controllers normally catch these first).
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Some of the values entered are not valid' });
  }
  // MongoDB unique index was violated
  if (err.code === 11000) {
    return res.status(409).json({ error: 'This already exists' });
  }

  const status = err.status || 500;

  // Unexpected errors: log the details, but don't leak them to the user
  if (status === 500) console.error(err);

  res.status(status).json({ error: status === 500 ? 'Something went wrong' : err.message });
}
