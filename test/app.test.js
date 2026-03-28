const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { normalizePayload } = require('../src/lib/normalize');
const { toPublicResponse } = require('../src/lib/response-mapper');
const { HttpError } = require('../src/lib/http-error');

function buildEnv() {
  return {
    APP_NAME: 'enllac-agent-test',
    NODE_ENV: 'test',
    PORT: 0,
    OPENAI_API_KEY: 'test-key',
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

function sampleBody(extra = {}) {
  return {
    language: 'es',
    scenario: 'familia',
    winery: { name: 'Celler Test', slug: 'celler-test' },
    experiences: [{ id: 'exp_1', title_es: 'Cata', price: 29 }],
    lead: { name: 'Ana', email: 'ana@test.com', phone: '+34123456' },
    messages: [{ role: 'user', content: 'Busco visita para 2 personas' }],
    ...extra
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
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => ({}) } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });
});

test('POST /v1/chat returns 400 on invalid body', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => ({}) } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [] }) });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'INVALID_BODY');
  });
});

test('POST /chat and /v1/chat both work', async () => {
  const llm = { isReady: () => true, generateStructuredJson: async () => ({ reply_text: 'Hola', language: 'es', detected_intent: 'book', objection_detected: 'none', lead_stage: 'qualified', next_step: 'ask_contact', ask_for_contact: true, fields_to_update: {} }) };
  const app = createApp({ env: buildEnv(), overrides: { llmService: llm } });
  await withServer(app, async (baseUrl) => {
    for (const path of ['/chat', '/v1/chat']) {
      const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sampleBody()) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Object.prototype.hasOwnProperty.call(data, 'reply_text'));
      assert.ok(Object.prototype.hasOwnProperty.call(data, 'fields_to_update'));
    }
  });
});

test('normalization supports multi-sector', () => {
  const normalized = normalizePayload(sampleBody({ sector: 'clinic', winery: undefined, businessContext: { name: 'Clinica Demo' } }), buildEnv());
  assert.equal(normalized.sector, 'clinic');
  assert.equal(normalized.businessContext.name, 'Clinica Demo');
});

test('public response compatibility keeps expected top-level fields', () => {
  const normalized = normalizePayload(sampleBody(), buildEnv());
  const mapped = toPublicResponse({ reply_text: 'ok', language: 'es', detected_intent: 'general_query', objection_detected: 'none', lead_stage: 'new', next_step: 'continue', ask_for_contact: false, fields_to_update: {} }, normalized);
  assert.ok('recommended_experience_id' in mapped);
  assert.ok('desired_date' in mapped);
  assert.ok('lead_email' in mapped);
});

test('LLM provider failure returns 502', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => { throw new HttpError(502, 'PROVIDER_ERROR', 'upstream'); } } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sampleBody()) });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.error.code, 'PROVIDER_ERROR');
  });
});

test('LLM timeout returns 503', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => { throw new HttpError(503, 'PROVIDER_TIMEOUT', 'timeout'); } } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sampleBody()) });
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.error.code, 'PROVIDER_TIMEOUT');
  });
});
