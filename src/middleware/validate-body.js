const { PublicChatRequestSchema } = require('../schemas/public-chat-request.schema');
const { HttpError } = require('../lib/http-error');

function validateBody(req, _res, next) {
  const parsed = PublicChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return next(new HttpError(400, 'INVALID_BODY', `${first.path.join('.') || 'body'}: ${first.message}`));
  }
  req.validatedBody = parsed.data;
  return next();
}

module.exports = { validateBody };
