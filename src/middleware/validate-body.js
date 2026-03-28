const { PublicChatRequestSchema } = require('../schemas/public-chat-request.schema');
const { HttpError } = require('../lib/http-error');
const { adaptPublicRequestShape } = require('../lib/request-shape-adapter');

function validateBody(req, _res, next) {
  const adapted = adaptPublicRequestShape(req.body);
  const parsed = PublicChatRequestSchema.safeParse(adapted);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return next(new HttpError(400, 'INVALID_BODY', `${first.path.join('.') || 'body'}: ${first.message}`));
  }

  const hasConversation = Array.isArray(parsed.data.messages) && parsed.data.messages.length > 0;
  if (!hasConversation) {
    return next(new HttpError(400, 'INVALID_BODY', 'messages: At least one message with content is required'));
  }

  req.validatedBody = parsed.data;
  return next();
}

module.exports = { validateBody };
