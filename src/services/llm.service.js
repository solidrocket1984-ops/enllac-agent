const { HttpError } = require('../lib/http-error');
const { createResponse } = require('../lib/openai-client');

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

function createLlmService({ env, modelConfig, logger }) {
  async function generateStructuredJson({ systemPrompt, userPayload, requestId }) {
    try {
      const response = await createResponse({
        apiKey: env.OPENAI_API_KEY,
        timeout: modelConfig.timeoutMs,
        body: {
          model: modelConfig.model,
          max_output_tokens: 900,
          temperature: 0.2,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
            { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(userPayload) }] },
            { role: 'user', content: [{ type: 'input_text', text: 'Return ONLY a JSON object with the agreed public fields.' }] }
          ]
        }
      });

      const outputText = extractText(response).trim();
      if (!outputText) throw new HttpError(502, 'PROVIDER_ERROR', 'Provider returned empty output');

      try {
        return JSON.parse(outputText);
      } catch (_e) {
        const match = outputText.match(/\{[\s\S]*\}$/);
        if (match) return JSON.parse(match[0]);
        throw new HttpError(502, 'PROVIDER_ERROR', 'Provider output is not valid JSON');
      }
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
