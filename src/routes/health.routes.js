const express = require('express');

function createHealthRoutes({ env }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ ok: true, service: env.APP_NAME, status: 'up' });
  });

  router.get('/healthz', (req, res) => {
    res.json({ ok: true, status: 'healthy', service: env.APP_NAME });
  });

  router.get('/readyz', (req, res) => {
    const ready = !!env.OPENAI_MODEL;
    if (!ready) {
      return res.status(503).json({ ok: false, status: 'not_ready', reason: 'missing model config' });
    }
    return res.json({ ok: true, status: 'ready' });
  });

  return router;
}

module.exports = { createHealthRoutes };
