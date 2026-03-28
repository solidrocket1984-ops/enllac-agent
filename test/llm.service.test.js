const test = require('node:test');
const assert = require('node:assert/strict');

const { createLlmService } = require('../src/services/llm.service');
const { HttpError } = require('../src/lib/http-error');

function buildLogger() {
  const entries = [];
  return {
    logger: {
      info: (message, data) => entries.push({ level: 'info', message, data }),
      warn: (message, data) => entries.push({ level: 'warn', message, data }),
      debug: (message, data) => entries.push({ level: 'debug', message, data })
    },
    entries
  };
}

function buildService({ createResponseFn, logger }) {
  return createLlmService({
    env: { OPENAI_API_KEY: 'test-key' },
    modelConfig: { model: 'gpt-4.1-mini', timeoutMs: 5000 },
    logger,
    createResponseFn
  });
}

test('uses json_schema format with expected shape', async () => {
  let firstBody;
  const { logger } = buildLogger();
  const service = buildService({
    logger,
    createResponseFn: async ({ body }) => {
      firstBody = body;
      return { output_text: '{"reply_text":"ok"}' };
    }
  });

  const output = await service.generateStructuredJson({ systemPrompt: 's', userPayload: { a: 1 }, requestId: 'r1' });
  assert.equal(output.reply_text, 'ok');

  assert.equal(firstBody.text.format.type, 'json_schema');
  assert.equal(firstBody.text.format.name, 'enllac_agent_output');
  assert.ok(firstBody.text.format.schema);
  assert.equal(firstBody.text.format.strict, false);
  assert.ok(!Object.prototype.hasOwnProperty.call(firstBody.text.format, 'json_schema'));
});

test('falls back to json_object when json_schema is rejected by provider', async () => {
  const { logger, entries } = buildLogger();
  const bodies = [];
  const service = buildService({
    logger,
    createResponseFn: async ({ body }) => {
      bodies.push(body);
      if (bodies.length === 1) {
        const error = new Error('bad format');
        error.status = 400;
        error.providerCode = 'unsupported_response_format';
        error.providerRequestId = 'req_schema';
        error.providerBody = { error: { message: 'json_schema is not supported for this model' } };
        throw error;
      }
      return { output_text: '{"reply_text":"fallback ok"}' };
    }
  });

  const output = await service.generateStructuredJson({ systemPrompt: 's', userPayload: { a: 1 }, requestId: 'r2' });
  assert.equal(output.reply_text, 'fallback ok');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].text.format.type, 'json_schema');
  assert.equal(bodies[1].text.format.type, 'json_object');

  assert.ok(entries.some((entry) => entry.message === 'llm_mode_json_object_fallback'));
});

test('does not use json_object fallback when json_schema succeeds', async () => {
  const { logger, entries } = buildLogger();
  let calls = 0;
  const service = buildService({
    logger,
    createResponseFn: async () => {
      calls += 1;
      return { output_text: '{"reply_text":"direct ok"}' };
    }
  });

  const output = await service.generateStructuredJson({ systemPrompt: 's', userPayload: { a: 1 }, requestId: 'r3' });
  assert.equal(output.reply_text, 'direct ok');
  assert.equal(calls, 1);
  assert.ok(entries.some((entry) => entry.message === 'llm_mode_json_schema'));
  assert.ok(!entries.some((entry) => entry.message === 'llm_mode_json_object_fallback'));
});

test('maps timeout provider error to HttpError PROVIDER_TIMEOUT', async () => {
  const { logger } = buildLogger();
  const service = buildService({
    logger,
    createResponseFn: async () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    }
  });

  await assert.rejects(
    () => service.generateStructuredJson({ systemPrompt: 's', userPayload: { a: 1 }, requestId: 'r4' }),
    (error) => error instanceof HttpError && error.code === 'PROVIDER_TIMEOUT'
  );
});
