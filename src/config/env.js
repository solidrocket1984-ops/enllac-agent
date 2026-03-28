const dotenv = require('dotenv');
const { z } = require('../lib/zod-lite');

dotenv.config();

const EnvSchema = z.object({
  PORT: z.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  OPENAI_TIMEOUT_MS: z.number().int().min(1000).max(120000).default(15000),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  AGENT_SHARED_TOKEN: z.string().optional().default(''),
  DEFAULT_SECTOR: z.string().min(1).default('generic'),
  RATE_LIMIT_WINDOW_MS: z.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.number().int().min(1).default(60),
  BODY_LIMIT: z.string().min(2).default('250kb'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_NAME: z.string().min(1).default('enllac-agent')
});

function parseOrigins(input) {
  return input.split(',').map((v) => v.trim()).filter(Boolean);
}

function num(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function loadEnv() {
  const raw = {
    PORT: num(process.env.PORT),
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_TIMEOUT_MS: num(process.env.OPENAI_TIMEOUT_MS),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    AGENT_SHARED_TOKEN: process.env.AGENT_SHARED_TOKEN,
    DEFAULT_SECTOR: process.env.DEFAULT_SECTOR,
    RATE_LIMIT_WINDOW_MS: num(process.env.RATE_LIMIT_WINDOW_MS),
    RATE_LIMIT_MAX: num(process.env.RATE_LIMIT_MAX),
    BODY_LIMIT: process.env.BODY_LIMIT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    APP_NAME: process.env.APP_NAME
  };

  if ((raw.NODE_ENV || 'development') === 'test' && !raw.OPENAI_API_KEY) raw.OPENAI_API_KEY = 'test-key';

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const error = new Error(`Invalid environment configuration: ${details}`);
    error.code = 'INVALID_ENV';
    throw error;
  }

  return {
    ...parsed.data,
    ALLOWED_ORIGINS: parseOrigins(parsed.data.ALLOWED_ORIGINS)
  };
}

module.exports = { loadEnv };
