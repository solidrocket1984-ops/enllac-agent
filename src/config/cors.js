const { HttpError } = require('../lib/http-error');

function buildCorsOptions(env) {
  const allowlist = new Set(env.ALLOWED_ORIGINS);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowlist.size === 0) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(new HttpError(403, 'FORBIDDEN_ORIGIN', 'Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Agent-Token'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 600
  };
}

module.exports = { buildCorsOptions };
