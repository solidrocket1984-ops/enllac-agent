const { HttpError } = require('../lib/http-error');

function authIfConfigured(env) {
  return function authMiddleware(req, res, next) {
    if (!env.AGENT_SHARED_TOKEN) return next();

    const token = req.headers['x-agent-token'];
    if (!token) {
      return next(new HttpError(401, 'MISSING_AUTH_TOKEN', 'Missing x-agent-token header'));
    }
    if (token !== env.AGENT_SHARED_TOKEN) {
      return next(new HttpError(403, 'INVALID_AUTH_TOKEN', 'Invalid x-agent-token'));
    }
    return next();
  };
}

module.exports = { authIfConfigured };
