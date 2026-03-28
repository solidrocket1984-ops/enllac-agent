const { normalizePayload, toPublicResponse } = require('../lib/normalize');
const { buildSystemPrompt } = require('./prompt-builder.service');
const { validateLlmOutput } = require('../schemas/llm-output.schema');
const { validatePublicResponse } = require('../schemas/chat-response.schema');

function createAgentService({ env, llmService, logger }) {
  async function processChat(payload, requestId) {
    const normalized = normalizePayload(payload, env);
    const systemPrompt = buildSystemPrompt(normalized.sector);

    let llmOutput;
    try {
      llmOutput = await llmService.generateStructuredJson({
        systemPrompt,
        userPayload: normalized,
        requestId
      });
      validateLlmOutput(llmOutput);
    } catch (error) {
      logger.warn('llm output fallback used', { request_id: requestId, code: error.code || 'UNKNOWN' });
      llmOutput = {
        reply_text: 'Gracias por tu mensaje. Estoy revisando la mejor recomendación para ti.',
        language: normalized.language,
        detected_intent: 'fallback',
        people_count: null,
        recommended_experience_id: null,
        alternative_experience_id: null,
        objection_detected: 'none',
        lead_stage: 'new',
        next_step: 'collect_requirements',
        ask_for_contact: false,
        conversation_summary: 'Fallback response due to LLM error',
        lead_name: normalized.leadContext.name,
        lead_email: normalized.leadContext.email,
        lead_phone: normalized.leadContext.phone,
        desired_date: null,
        fields_to_update: {}
      };
    }

    const publicResponse = toPublicResponse(llmOutput, normalized);
    validatePublicResponse(publicResponse);
    return {
      ...publicResponse,
      _meta: {
        request_id: requestId,
        sector: normalized.sector,
        compatibility_mode: true
      }
    };
  }

  return { processChat };
}

module.exports = { createAgentService };
