function errorHandler(logger, env) {
  return function onError(err, req, res, next) {
    const status = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = status >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Unexpected error');

    logger.error('request failed', {
      request_id: req.requestId,
      status,
      code,
      path: req.path,
      method: req.method,
      error: err.message
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
