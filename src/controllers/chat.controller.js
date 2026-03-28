const { summarizePayload } = require('../lib/redact');

function createChatController({ agentService, logger }) {
  return async function chatController(req, res, next) {
    const start = Date.now();
    try {
      logger.info('chat_request_received', {
        request_id: req.requestId,
        payload: summarizePayload(req.validatedBody || req.body)
      });

      const response = await agentService.processChat(req.validatedBody || req.body, req.requestId);

      logger.info('chat_request_completed', {
        request_id: req.requestId,
        duration_ms: Date.now() - start,
        intent: response.detected_intent,
        stage: response.lead_stage
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createChatController };
