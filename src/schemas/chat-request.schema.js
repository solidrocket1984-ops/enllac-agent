const { HttpError } = require('../lib/http-error');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateChatRequest(body) {
  if (!isObject(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new HttpError(400, 'INVALID_BODY', 'messages must be a non-empty array');
  }

  if (body.messages.length > 60) {
    throw new HttpError(400, 'INVALID_BODY', 'messages array exceeds max size (60)');
  }

  for (const msg of body.messages) {
    if (!isObject(msg) || !['user', 'assistant'].includes(msg.role) || typeof msg.content !== 'string') {
      throw new HttpError(400, 'INVALID_BODY', 'Each message must have role user|assistant and text content');
    }
    if (msg.content.length > 6000) {
      throw new HttpError(400, 'INVALID_BODY', 'Message content exceeds max length (6000)');
    }
  }

  if (body.experiences && !Array.isArray(body.experiences)) {
    throw new HttpError(400, 'INVALID_BODY', 'experiences must be an array');
  }

  if (body.winery && !isObject(body.winery)) {
    throw new HttpError(400, 'INVALID_BODY', 'winery must be an object when provided');
  }

  if (body.lead && !isObject(body.lead)) {
    throw new HttpError(400, 'INVALID_BODY', 'lead must be an object when provided');
  }

  return true;
}

module.exports = { validateChatRequest };
