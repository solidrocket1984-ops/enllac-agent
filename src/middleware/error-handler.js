function errorHandler(logger, env) {
  return function onError(err, req, res, _next) {
    const status = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = status >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Unexpected error');

    logger.error('request_error', {
      request_id: req.requestId,
      status,
      code,
      method: req.method,
      path: req.path,
      stack: env.NODE_ENV === 'production' ? undefined : err.stack
    });

    res.status(status).json({
      ok: false,
      error: {
        code,
        message,
        request_id: req.requestId
      }
    });
  };
}

module.exports = { errorHandler };
