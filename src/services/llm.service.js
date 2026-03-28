const { HttpError } = require('../lib/http-error');
const { createResponse } = require('../lib/openai-client');

const RESPONSE_JSON_SCHEMA = {
  name: 'enllac_agent_output',
  schema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      reply_text: { type: 'string' },
      language: { type: 'string' },
      detected_intent: { type: 'string' },
      people_count: { type: ['integer', 'string', 'null'] },
      recommended_experience_id: { type: ['string', 'number', 'null'] },
      alternative_experience_id: { type: ['string', 'number', 'null'] },
      objection_detected: { type: 'string' },
      lead_stage: { type: 'string' },
      next_step: { type: 'string' },
      ask_for_contact: { type: 'boolean' },
      conversation_summary: { type: ['string', 'null'] },
      lead_name: { type: ['string', 'null'] },
      lead_email: { type: ['string', 'null'] },
      lead_phone: { type: ['string', 'null'] },
      desired_date: { type: ['string', 'null'] },
      fields_to_update: { type: 'object' }
    },
    required: ['reply_text']
  },
  strict: false
};

const PROVIDER_ERROR_SCHEMA_HINTS = ['invalid_json_schema', 'unsupported_response_format', 'response_format', 'json_schema', 'schema'];

function extractText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text;
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!Array.isArray(item.content)) continue;
      for (const part of item.content) {
        if ((part.type === 'output_text' || part.type === 'text') && part.text) return part.text;
      }
    }
  }
  return '';
}

function parseOutputText(outputText) {
  try {
    return JSON.parse(outputText);
  } catch (_e) {
    const match = outputText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new HttpError(502, 'PROVIDER_ERROR', 'Provider output is not valid JSON');
  }
}

function summarizeProviderBody(providerBody) {
  if (!providerBody) return null;
  try {
    const source = typeof providerBody === 'string' ? providerBody : JSON.stringify(providerBody);
    return source.slice(0, 400);
  } catch (_error) {
    return 'unserializable_provider_body';
  }
}

function shouldFallbackToJsonObject(error) {
  if (!error || error.code === 'ETIMEDOUT') return false;
  if (!error.status || error.status < 400 || error.status >= 500) return false;

  const providerCode = String(error.providerCode || error.code || '').toLowerCase();
  const providerBody = summarizeProviderBody(error.providerBody) || '';
  const providerBodyLower = providerBody.toLowerCase();

  return PROVIDER_ERROR_SCHEMA_HINTS.some((hint) => providerCode.includes(hint) || providerBodyLower.includes(hint));
}

function buildRequestBody({ model, systemPrompt, userPayload, format }) {
  return {
    model,
    max_output_tokens: 900,
    temperature: 0.15,
    text: { format },
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(userPayload) }] },
      { role: 'user', content: [{ type: 'input_text', text: 'Return ONLY a JSON object with the agreed public fields.' }] }
    ]
  };
}

function createLlmService({ env, modelConfig, logger, createResponseFn = createResponse }) {
  async function requestWithFormat({ systemPrompt, userPayload, format }) {
    const response = await createResponseFn({
      apiKey: env.OPENAI_API_KEY,
      timeout: modelConfig.timeoutMs,
      body: buildRequestBody({ model: modelConfig.model, systemPrompt, userPayload, format })
    });

    const outputText = extractText(response).trim();
    if (!outputText) throw new HttpError(502, 'PROVIDER_ERROR', 'Provider returned empty output');
    return parseOutputText(outputText);
  }

  async function generateStructuredJson({ systemPrompt, userPayload, requestId }) {
    let jsonSchemaFailed = false;

    try {
      const result = await requestWithFormat({
        systemPrompt,
        userPayload,
        format: {
          type: 'json_schema',
          name: RESPONSE_JSON_SCHEMA.name,
          schema: RESPONSE_JSON_SCHEMA.schema,
          strict: RESPONSE_JSON_SCHEMA.strict
        }
      });
      logger.info('llm_mode_json_schema', { request_id: requestId });
      return result;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      jsonSchemaFailed = true;
      logger.warn('llm_provider_error', {
        request_id: requestId,
        mode: 'json_schema',
        status: error.status,
        provider_code: error.providerCode || error.code || 'UNKNOWN',
        provider_request_id: error.providerRequestId || null,
        provider_error_body: summarizeProviderBody(error.providerBody)
      });

      if (shouldFallbackToJsonObject(error)) {
        try {
          const result = await requestWithFormat({
            systemPrompt,
            userPayload,
            format: { type: 'json_object' }
          });
          logger.warn('llm_mode_json_object_fallback', {
            request_id: requestId,
            json_schema_failed: true,
            provider_request_id: error.providerRequestId || null
          });
          return result;
        } catch (fallbackError) {
          logger.warn('llm_provider_error', {
            request_id: requestId,
            mode: 'json_object',
            status: fallbackError.status,
            provider_code: fallbackError.providerCode || fallbackError.code || 'UNKNOWN',
            provider_request_id: fallbackError.providerRequestId || null,
            provider_error_body: summarizeProviderBody(fallbackError.providerBody)
          });
          error = fallbackError;
        }
      }

      if (error.code === 'ETIMEDOUT') throw new HttpError(503, 'PROVIDER_TIMEOUT', 'Provider request timed out');
      if (error.status >= 500) throw new HttpError(503, 'PROVIDER_ERROR', 'Provider unavailable');
      throw new HttpError(502, 'PROVIDER_ERROR', 'Provider request failed');
    } finally {
      if (jsonSchemaFailed) {
        logger.debug('llm_json_schema_attempt_failed', { request_id: requestId });
      }
    }
  }

  function isReady() {
    return Boolean(env.OPENAI_API_KEY && modelConfig.model);
  }

  return { generateStructuredJson, isReady };
}

module.exports = { createLlmService, RESPONSE_JSON_SCHEMA, shouldFallbackToJsonObject, summarizeProviderBody };
