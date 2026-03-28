const express = require('express');

function createHealthRoutes({ env, llmService }) {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ ok: true, service: env.APP_NAME, status: 'up', uptime_s: Math.floor(process.uptime()) });
  });

  router.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      service: env.APP_NAME,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor(process.uptime())
    });
  });

  router.get('/readyz', (_req, res) => {
    const checks = {
      env_loaded: Boolean(env.OPENAI_MODEL),
      llm_ready: Boolean(llmService && llmService.isReady && llmService.isReady())
    };
    const ready = checks.env_loaded && checks.llm_ready;

    if (!ready) {
      return res.status(503).json({ ok: false, status: 'not_ready', checks });
    }

    return res.json({ ok: true, status: 'ready', checks });
  });

  return router;
}

module.exports = { createHealthRoutes };
