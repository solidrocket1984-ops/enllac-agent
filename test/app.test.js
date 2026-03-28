const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { normalizePayload, toPublicResponse } = require('../src/lib/normalize');

function buildEnv() {
  return {
    APP_NAME: 'enllac-agent-test',
    NODE_ENV: 'test',
    PORT: 0,
    OPENAI_API_KEY: '',
    OPENAI_MODEL: 'gpt-4.1-mini',
    OPENAI_TIMEOUT_MS: 3000,
    ALLOWED_ORIGINS: [],
    AGENT_SHARED_TOKEN: '',
    LOG_LEVEL: 'error',
    DEFAULT_SECTOR: 'generic',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 100,
    BODY_LIMIT: '250kb'
  };
}

function sampleBody() {
  return {
    language: 'es',
    scenario: 'familia',
    winery: { name: 'Celler Test', slug: 'celler-test' },
    experiences: [{ id: 'exp_1', title_es: 'Cata', price: 29 }],
    lead: { name: 'Ana', email: 'ana@test.com', phone: '+34123456' },
    messages: [{ role: 'user', content: 'Busco visita para 2 personas' }]
  };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /healthz returns healthy', async () => {
  const app = createApp({
    env: buildEnv(),
    overrides: { llmService: { generateStructuredJson: async () => ({}) } }
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.status, 'healthy');
  });
});

test('POST /v1/chat returns 400 on invalid body', async () => {
  const app = createApp({
    env: buildEnv(),
    overrides: { llmService: { generateStructuredJson: async () => ({}) } }
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [] })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, 'INVALID_BODY');
  });
});

test('POST /chat alias works and returns compatible fields', async () => {
  const app = createApp({
    env: buildEnv(),
    overrides: {
      llmService: {
        generateStructuredJson: async () => ({
          reply_text: 'Hola',
          language: 'es',
          detected_intent: 'book',
          people_count: 2,
          recommended_experience_id: 'exp_1',
          alternative_experience_id: null,
          objection_detected: 'none',
          lead_stage: 'qualified',
          next_step: 'ask_contact',
          ask_for_contact: true,
          conversation_summary: 'ok',
          lead_name: null,
          lead_email: null,
          lead_phone: null,
          desired_date: null,
          fields_to_update: {}
        })
      }
    }
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleBody())
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok('reply_text' in data);
    assert.ok('fields_to_update' in data);
    assert.ok('lead_email' in data);
  });
});

test('normalizePayload maps winery to businessContext and experiences to offers', () => {
  const normalized = normalizePayload(sampleBody(), buildEnv());
  assert.equal(normalized.businessContext.type, 'winery');
  assert.equal(normalized.offers[0].id, 'exp_1');
  assert.equal(normalized.leadContext.name, 'Ana');
});

test('toPublicResponse keeps public contract shape', () => {
  const normalized = normalizePayload(sampleBody(), buildEnv());
  const publicRes = toPublicResponse({ reply_text: 'Hola', language: 'es', detected_intent: 'x', objection_detected: 'none', lead_stage: 'new', next_step: 'continue', ask_for_contact: false }, normalized);
  assert.ok(Object.prototype.hasOwnProperty.call(publicRes, 'desired_date'));
  assert.ok(Object.prototype.hasOwnProperty.call(publicRes, 'recommended_experience_id'));
});

test('LLM failure triggers safe fallback response', async () => {
  const app = createApp({
    env: buildEnv(),
    overrides: {
      llmService: {
        generateStructuredJson: async () => {
          throw new Error('LLM down');
        }
      }
    }
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleBody())
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.detected_intent, 'fallback');
    assert.equal(typeof data.reply_text, 'string');
  });
});
