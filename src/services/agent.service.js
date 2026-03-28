const { normalizePayload } = require('../lib/normalize');
const { toPublicResponse } = require('../lib/response-mapper');
const { buildSystemPrompt } = require('./prompt-builder.service');
const { resolveSector } = require('./sector-context.service');
const { LlmOutputSchema } = require('../schemas/llm-output.schema');

function fallbackOutput(normalized) {
  return {
    reply_text: 'Gracias por tu mensaje. Para ayudarte mejor, ¿me confirmas cuántas personas serían y fecha aproximada?',
    language: normalized.language,
    detected_intent: 'fallback',
    people_count: null,
    recommended_experience_id: null,
    alternative_experience_id: null,
    objection_detected: 'none',
    lead_stage: 'new',
    next_step: 'collect_requirements',
    ask_for_contact: false,
    conversation_summary: 'Fallback response due to invalid model output',
    lead_name: normalized.leadContext.name,
    lead_email: normalized.leadContext.email,
    lead_phone: normalized.leadContext.phone,
    desired_date: null,
    fields_to_update: {}
  };
}

function createAgentService({ env, llmService, logger }) {
  async function processChat(payload, requestId) {
    const normalized = normalizePayload(payload, env);
    normalized.sector = resolveSector({ requestSector: payload.sector, inferredSector: normalized.sector, envDefault: env.DEFAULT_SECTOR });

    const systemPrompt = buildSystemPrompt(normalized.sector);

    let output;
    try {
      const raw = await llmService.generateStructuredJson({ systemPrompt, userPayload: normalized, requestId });
      const parsed = LlmOutputSchema.safeParse(raw);
      output = parsed.success ? parsed.data : fallbackOutput(normalized);
      if (!parsed.success) {
        logger.warn('llm_output_invalid', { request_id: requestId, issues: parsed.error.issues.length });
      }
    } catch (error) {
      if (error.code === 'PROVIDER_ERROR' || error.code === 'PROVIDER_TIMEOUT') {
        throw error;
      }
      logger.warn('llm_unexpected_error', { request_id: requestId, code: error.code || 'UNKNOWN' });
      output = fallbackOutput(normalized);
    }

    return {
      ...toPublicResponse(output, normalized),
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
