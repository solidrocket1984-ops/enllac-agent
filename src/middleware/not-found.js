function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      request_id: req.requestId || null
    }
  });
}

module.exports = { notFound };
