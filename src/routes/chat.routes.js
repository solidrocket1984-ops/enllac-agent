const express = require('express');
const { validateBody } = require('../middleware/validate-body');

function createChatRoutes({ chatController }) {
  const router = express.Router();

  router.post('/v1/chat', validateBody, chatController);
  router.post('/chat', validateBody, chatController);
  router.post('/', validateBody, chatController); // legacy alias

  return router;
}

module.exports = { createChatRoutes };
