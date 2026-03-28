const { summarizePayload } = require('../lib/redact');

function createChatController({ agentService, logger }) {
  return async function chatController(req, res, next) {
    const start = Date.now();
    try {
      logger.info('chat request received', {
        request_id: req.requestId,
        payload: summarizePayload(req.body)
      });

      const response = await agentService.processChat(req.body, req.requestId);

      logger.info('chat request completed', {
        request_id: req.requestId,
        duration_ms: Date.now() - start,
        intent: response.detected_intent,
        lead_stage: response.lead_stage
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createChatController };
