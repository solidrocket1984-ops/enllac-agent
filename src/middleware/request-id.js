const crypto = require('crypto');

function pickHeader(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null;
}

function requestIdMiddleware(req, res, next) {
  const canonical = pickHeader(req.headers['x-request-id']);
  const legacy = pickHeader(req.headers['x-demo-request-id']);
  const requestId = canonical || legacy || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = { requestIdMiddleware };
