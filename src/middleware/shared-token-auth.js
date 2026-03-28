const { HttpError } = require('../lib/http-error');

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}

function sharedTokenAuth(env) {
  return function authMiddleware(req, _res, next) {
    if (!env.AGENT_SHARED_TOKEN) return next();

    const headerToken = typeof req.headers['x-agent-token'] === 'string' ? req.headers['x-agent-token'].trim() : '';
    const bearerToken = extractBearerToken(req);
    const provided = headerToken || bearerToken;

    if (!provided) return next(new HttpError(401, 'MISSING_AUTH_TOKEN', 'Missing x-agent-token or Authorization Bearer token'));
    if (provided !== env.AGENT_SHARED_TOKEN) return next(new HttpError(403, 'INVALID_AUTH_TOKEN', 'Invalid shared token'));

    return next();
  };
}

module.exports = { sharedTokenAuth };
