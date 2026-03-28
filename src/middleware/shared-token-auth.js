const { HttpError } = require('../lib/http-error');

function sharedTokenAuth(env) {
  return function authMiddleware(req, _res, next) {
    if (!env.AGENT_SHARED_TOKEN) return next();
    const provided = req.headers['x-agent-token'];
    if (!provided) return next(new HttpError(401, 'MISSING_AUTH_TOKEN', 'Missing x-agent-token'));
    if (provided !== env.AGENT_SHARED_TOKEN) return next(new HttpError(403, 'INVALID_AUTH_TOKEN', 'Invalid x-agent-token'));
    return next();
  };
}

module.exports = { sharedTokenAuth };
