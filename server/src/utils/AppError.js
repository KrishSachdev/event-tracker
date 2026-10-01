// An error that also carries an HTTP status code (400, 404, ...).
// Throw it anywhere, and the error handler sends the right response.
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
