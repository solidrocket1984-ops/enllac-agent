const express = require('express');
const cors = require('cors');
const helmet = require('./middleware/helmet-lite');
const { buildCorsOptions } = require('./config/cors');
const { buildModelConfig } = require('./config/model');
const { createLogger } = require('./lib/logger');
const { requestIdMiddleware } = require('./middleware/request-id');
const { createRateLimiter } = require('./middleware/rate-limit');
const { sharedTokenAuth } = require('./middleware/shared-token-auth');
const { errorHandler } = require('./middleware/error-handler');
const { notFound } = require('./middleware/not-found');
const { createLlmService } = require('./services/llm.service');
const { createAgentService } = require('./services/agent.service');
const { createChatController } = require('./controllers/chat.controller');
const { createChatRoutes } = require('./routes/chat.routes');
const { createHealthRoutes } = require('./routes/health.routes');

function createApp({ env, overrides = {} }) {
  const logger = overrides.logger || createLogger({ level: env.LOG_LEVEL, name: env.APP_NAME });
  const app = express();

  app.set('trust proxy', true);
  app.use(requestIdMiddleware);
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info('http_request', {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt
      });
    });
    next();
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(buildCorsOptions(env)));
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(createRateLimiter({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }));
  app.use(sharedTokenAuth(env));

  const modelConfig = buildModelConfig(env);
  const llmService = overrides.llmService || createLlmService({ env, modelConfig, logger });
  const agentService = createAgentService({ env, llmService, logger });
  const chatController = createChatController({ agentService, logger });

  app.use(createHealthRoutes({ env, llmService }));
  app.use(createChatRoutes({ chatController }));

  app.use(notFound);
  app.use(errorHandler(logger, env));

  logger.info('app_initialized', {
    node_env: env.NODE_ENV,
    port: env.PORT,
    model: env.OPENAI_MODEL,
    timeout_ms: env.OPENAI_TIMEOUT_MS,
    cors_allowlist_size: env.ALLOWED_ORIGINS.length,
    shared_token_enabled: Boolean(env.AGENT_SHARED_TOKEN)
  });

  return app;
}

module.exports = { createApp };
