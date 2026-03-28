function buildCorsOptions(env) {
  const allowlist = env.ALLOWED_ORIGINS;
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowlist.length || allowlist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-agent-token', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    credentials: false,
    maxAge: 600
  };
}

module.exports = { buildCorsOptions };
