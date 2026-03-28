const express = require('express');

function createHealthRoutes({ env, llmService }) {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ ok: true, service: env.APP_NAME, status: 'up' });
  });

  router.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: env.APP_NAME, status: 'healthy' });
  });

  router.get('/readyz', (_req, res) => {
    const ready = llmService && llmService.isReady && llmService.isReady();
    if (!ready) {
      return res.status(503).json({ ok: false, status: 'not_ready', reason: 'llm provider not configured' });
    }
    return res.json({ ok: true, status: 'ready' });
  });

  return router;
}

module.exports = { createHealthRoutes };
