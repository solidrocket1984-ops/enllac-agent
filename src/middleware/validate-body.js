const { validateChatRequest } = require('../schemas/chat-request.schema');

function validateBody(req, res, next) {
  validateChatRequest(req.body);
  next();
}

module.exports = { validateBody };
