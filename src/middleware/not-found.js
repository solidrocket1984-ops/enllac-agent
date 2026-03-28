const { HttpError } = require('../lib/http-error');

function notFound(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
}

module.exports = { notFound };
