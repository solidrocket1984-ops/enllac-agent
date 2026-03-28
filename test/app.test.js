const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { normalizePayload } = require('../src/lib/normalize');
const { toPublicResponse } = require('../src/lib/response-mapper');
const { HttpError } = require('../src/lib/http-error');

function buildEnv(overrides = {}) {
  return {
    APP_NAME: 'enllac-agent-test',
    NODE_ENV: 'test',
    PORT: 0,
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4.1-mini',
    OPENAI_TIMEOUT_MS: 30000,
    ALLOWED_ORIGINS: [],
    AGENT_SHARED_TOKEN: '',
    LOG_LEVEL: 'error',
    DEFAULT_SECTOR: 'generic',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 100,
    BODY_LIMIT: '250kb',
    ...overrides
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

function successfulLlmResponse() {
  return {
    reply_text: 'Hola',
    language: 'es',
    detected_intent: 'book',
    objection_detected: 'none',
    lead_stage: 'qualified',
    next_step: 'ask_contact',
    ask_for_contact: true,
    fields_to_update: {}
  };
}

test('GET /healthz returns healthy', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => ({}) } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.ok, true);
  });
});

test('GET /readyz returns ready', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => ({}) } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/readyz`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ready');
    assert.equal(data.checks.llm_ready, true);
  });
});

test('POST /v1/chat returns 400 on truly invalid body', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => ({}) } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'INVALID_BODY');
  });
});

test('POST /chat and /v1/chat both work', async () => {
  const llm = { isReady: () => true, generateStructuredJson: async () => successfulLlmResponse() };
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

test('accepts winery.faqs and rules as string', () => {
  const normalized = normalizePayload(sampleBody({
    winery: {
      name: 'Bodega X',
      faqs: 'Horario: 10-18\nParking disponible',
      recommendation_rules: 'Si pareja, recomendación romántica',
      objection_rules: 'Si precio alto, explicar valor'
    }
  }), buildEnv());

  assert.equal(normalized.businessContext.faqs.length, 2);
  assert.equal(normalized.businessContext.recommendationRules.length, 2);
  assert.equal(normalized.businessContext.objectionRules.length, 2);
});

test('lead.email empty string is normalized to null', () => {
  const normalized = normalizePayload(sampleBody({ lead: { name: 'Ana', email: '', phone: '' } }), buildEnv());
  assert.equal(normalized.leadContext.email, null);
  assert.equal(normalized.leadContext.phone, null);
});

test('accepts simplified experiences shape', () => {
  const normalized = normalizePayload(sampleBody({
    experiences: [{ id: 9, name: 'Pack brunch', description: 'Con visita', price: '45', active: true, winery_id: 22 }]
  }), buildEnv());
  assert.equal(normalized.offers[0].id, '9');
  assert.equal(normalized.offers[0].title.es, 'Pack brunch');
  assert.equal(normalized.offers[0].description.es, 'Con visita');
  assert.equal(normalized.offers[0].price, 45);
});

test('accepts normalized payload input', () => {
  const normalized = normalizePayload({
    language: 'es',
    sector: 'clinic',
    businessContext: { type: 'clinic', name: 'Clínica Demo', description: 'Especialistas' },
    offers: [{ id: 'a1', name: 'Consulta inicial', description: 'Evaluación' }],
    leadContext: { name: 'Luis', email: '', phone: '+3400000' },
    conversation: [{ role: 'user', content: 'Necesito cita' }],
    metadata: { source: 'demo' }
  }, buildEnv());

  assert.equal(normalized.sector, 'clinic');
  assert.equal(normalized.businessContext.name, 'Clínica Demo');
  assert.equal(normalized.metadata.source, 'demo');
});

test('request id supports x-demo-request-id for backward compatibility', async () => {
  const llm = { isReady: () => true, generateStructuredJson: async () => successfulLlmResponse() };
  const app = createApp({ env: buildEnv(), overrides: { llmService: llm } });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-request-id': 'legacy-123' },
      body: JSON.stringify(sampleBody())
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-request-id'), 'legacy-123');
  });
});

test('shared token auth supports x-agent-token and Authorization bearer', async () => {
  const llm = { isReady: () => true, generateStructuredJson: async () => successfulLlmResponse() };
  const env = buildEnv({ AGENT_SHARED_TOKEN: 'secret' });
  const app = createApp({ env, overrides: { llmService: llm } });

  await withServer(app, async (baseUrl) => {
    const forbidden = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleBody())
    });
    assert.equal(forbidden.status, 401);

    const h1 = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-token': 'secret' },
      body: JSON.stringify(sampleBody())
    });
    assert.equal(h1.status, 200);

    const h2 = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
      body: JSON.stringify(sampleBody())
    });
    assert.equal(h2.status, 200);
  });
});

test('LLM timeout returns 503 with PROVIDER_TIMEOUT', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => { throw new HttpError(503, 'PROVIDER_TIMEOUT', 'timeout'); } } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sampleBody()) });
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.error.code, 'PROVIDER_TIMEOUT');
  });
});

test('LLM provider failure returns 502 with PROVIDER_ERROR', async () => {
  const app = createApp({ env: buildEnv(), overrides: { llmService: { isReady: () => true, generateStructuredJson: async () => { throw new HttpError(502, 'PROVIDER_ERROR', 'upstream'); } } } });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sampleBody()) });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.error.code, 'PROVIDER_ERROR');
  });
});

test('public response compatibility keeps expected top-level fields', () => {
  const normalized = normalizePayload(sampleBody(), buildEnv());
  const mapped = toPublicResponse(successfulLlmResponse(), normalized);
  assert.ok('recommended_experience_id' in mapped);
  assert.ok('desired_date' in mapped);
  assert.ok('lead_email' in mapped);
});
