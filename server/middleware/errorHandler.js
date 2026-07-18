// Central error handler. Logs the real error server-side but never leaks
// stack traces or internal messages to the client (Security).

// eslint-disable-next-line no-unused-vars -- Express requires 4 params to recognise an error handler
function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  const status = err.status || 500;
  const publicMessage =
    status === 500 ? 'Something went wrong while generating your content. Please try again.' : err.message;

  res.status(status).json({ error: publicMessage });
}

module.exports = errorHandler;
