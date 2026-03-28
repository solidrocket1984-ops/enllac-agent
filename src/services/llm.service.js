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

function createLlmService({ env, modelConfig, logger }) {
  async function generateStructuredJson({ systemPrompt, userPayload, requestId }) {
    try {
      const response = await createResponse({
        apiKey: env.OPENAI_API_KEY,
        timeout: modelConfig.timeoutMs,
        body: {
          model: modelConfig.model,
          max_output_tokens: 900,
          temperature: 0.15,
          text: { format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA } },
          input: [
            { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
            { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(userPayload) }] },
            { role: 'user', content: [{ type: 'input_text', text: 'Return ONLY a JSON object with the agreed public fields.' }] }
          ]
        }
      });

      const outputText = extractText(response).trim();
      if (!outputText) throw new HttpError(502, 'PROVIDER_ERROR', 'Provider returned empty output');
      return parseOutputText(outputText);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.warn('llm_provider_error', { request_id: requestId, status: error.status, provider_code: error.code || 'UNKNOWN' });
      if (error.code === 'ETIMEDOUT') throw new HttpError(503, 'PROVIDER_TIMEOUT', 'Provider request timed out');
      if (error.status >= 500) throw new HttpError(503, 'PROVIDER_ERROR', 'Provider unavailable');
      throw new HttpError(502, 'PROVIDER_ERROR', 'Provider request failed');
    }
  }

  function isReady() {
    return Boolean(env.OPENAI_API_KEY && modelConfig.model);
  }

  return { generateStructuredJson, isReady };
}

module.exports = { createLlmService };
