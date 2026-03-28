const dotenv = require('dotenv');

dotenv.config();

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseOrigins(value) {
  if (!value) return [];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const env = {
  APP_NAME: process.env.APP_NAME || 'enllac-agent',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toNumber(process.env.PORT, 3000),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  OPENAI_TIMEOUT_MS: toNumber(process.env.OPENAI_TIMEOUT_MS, 12000),
  ALLOWED_ORIGINS: parseOrigins(process.env.ALLOWED_ORIGINS),
  AGENT_SHARED_TOKEN: process.env.AGENT_SHARED_TOKEN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DEFAULT_SECTOR: process.env.DEFAULT_SECTOR || 'generic',
  RATE_LIMIT_WINDOW_MS: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  RATE_LIMIT_MAX: toNumber(process.env.RATE_LIMIT_MAX, 60),
  BODY_LIMIT: process.env.BODY_LIMIT || '250kb',
  ENABLE_PRETTY_LOGS: toBoolean(process.env.ENABLE_PRETTY_LOGS, false)
};

function validateEnvOrThrow(config) {
  const errors = [];
  if (!['development', 'test', 'production'].includes(config.NODE_ENV)) {
    errors.push('NODE_ENV must be development, test, or production');
  }
  if (!Number.isInteger(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(config.OPENAI_TIMEOUT_MS) || config.OPENAI_TIMEOUT_MS < 1000) {
    errors.push('OPENAI_TIMEOUT_MS must be >= 1000');
  }
  if (!Number.isInteger(config.RATE_LIMIT_WINDOW_MS) || config.RATE_LIMIT_WINDOW_MS < 1000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be >= 1000');
  }
  if (!Number.isInteger(config.RATE_LIMIT_MAX) || config.RATE_LIMIT_MAX < 1) {
    errors.push('RATE_LIMIT_MAX must be >= 1');
  }
  if (!config.OPENAI_MODEL) {
    errors.push('OPENAI_MODEL is required');
  }
  if (config.NODE_ENV === 'production' && !config.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required in production');
  }

  if (errors.length) {
    const message = `Invalid environment configuration: ${errors.join('; ')}`;
    const error = new Error(message);
    error.code = 'INVALID_ENV';
    throw error;
  }
}

module.exports = { env, validateEnvOrThrow };
