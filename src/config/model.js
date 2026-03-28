function buildModelConfig(env) {
  return {
    provider: 'openai-responses-http',
    model: env.OPENAI_MODEL,
    timeoutMs: env.OPENAI_TIMEOUT_MS
  };
}

module.exports = { buildModelConfig };
