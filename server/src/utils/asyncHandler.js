// Express 4 doesn't catch errors thrown inside async functions.
// This wrapper catches them and passes them to the error handler.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
