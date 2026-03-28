const express = require('express');
const { validateBody } = require('../middleware/validate-body');

function createChatRoutes({ chatController }) {
  const router = express.Router();

  // Canonical endpoint
  router.post('/v1/chat', validateBody, chatController);

  // Backwards-compatible aliases for existing frontend integrations.
  router.post('/chat', validateBody, chatController);
  router.post('/', validateBody, chatController);

  return router;
}

module.exports = { createChatRoutes };
