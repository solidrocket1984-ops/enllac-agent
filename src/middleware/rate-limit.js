const { HttpError } = require('../lib/http-error');

function createRateLimiter({ windowMs, max }) {
  const bucket = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const record = bucket.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    bucket.set(ip, record);

    const remaining = Math.max(0, max - record.count);
    res.setHeader('x-ratelimit-limit', max);
    res.setHeader('x-ratelimit-remaining', remaining);

    if (record.count > max) {
      return next(new HttpError(429, 'RATE_LIMITED', 'Too many requests'));
    }

    return next();
  };
}

module.exports = { createRateLimiter };
