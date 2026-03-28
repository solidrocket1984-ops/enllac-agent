const { normalizePayload } = require('../lib/normalize');
const { toPublicResponse } = require('../lib/response-mapper');
const { buildSystemPrompt } = require('./prompt-builder.service');
const { resolveSector } = require('./sector-context.service');
const { buildRepairResult } = require('./llm-output-repair.service');
const { redactEmail, redactPhone } = require('../lib/redact');

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

function summarizeRawOutput(raw) {
  const rawObj = raw && typeof raw === 'object' ? raw : { raw_type: typeof raw };
  const replyPreview = typeof rawObj.reply_text === 'string' ? rawObj.reply_text.slice(0, 220) : '';
  return {
    keys: Object.keys(rawObj).slice(0, 30),
    reply_text_preview: replyPreview,
    detected_intent: rawObj.detected_intent || null,
    lead_email: redactEmail(rawObj.lead_email),
    lead_phone: redactPhone(rawObj.lead_phone)
  };
}

function groupMissingRequiredFields(issues) {
  return issues
    .filter((issue) => issue.message && /Expected|at least/.test(issue.message))
    .map((issue) => issue.path?.[0])
    .filter(Boolean);
}

function createAgentService({ env, llmService, logger }) {
  async function processChat(payload, requestId) {
    const normalized = normalizePayload(payload, env);
    normalized.sector = resolveSector({ requestSector: payload.sector, inferredSector: normalized.sector, envDefault: env.DEFAULT_SECTOR });

    const systemPrompt = buildSystemPrompt(normalized);

    let output;
    try {
      const raw = await llmService.generateStructuredJson({ systemPrompt, userPayload: normalized, requestId });
      const repair = buildRepairResult(raw, normalized);

      if (!repair.rawSchemaValid) {
        logger.warn('llm_output_invalid_schema', {
          request_id: requestId,
          issues: repair.finalIssues,
          problematic_fields: repair.finalIssues.map((issue) => issue.path?.[0]).filter(Boolean),
          raw_output_summary: summarizeRawOutput(raw)
        });
      }

      if (!repair.finalSchemaValid) {
        const missingFields = groupMissingRequiredFields(repair.finalIssues);
        if (missingFields.length > 0) {
          logger.warn('llm_output_missing_required_fields', {
            request_id: requestId,
            missing_fields: missingFields,
            issues: repair.finalIssues,
            raw_output_summary: summarizeRawOutput(raw)
          });
        }
      }

      if (raw && typeof raw === 'object' && typeof raw.lead_email === 'string' && raw.lead_email.trim() && !repair.repaired.lead_email) {
        logger.warn('llm_output_bad_email', {
          request_id: requestId,
          raw_output_summary: summarizeRawOutput(raw)
        });
      }

      if (!repair.hasUsableReply) {
        logger.warn('llm_output_empty_reply', {
          request_id: requestId,
          raw_output_summary: summarizeRawOutput(raw)
        });
      }

      const repairedApplied = repair.hasUsableReply && repair.finalSchemaValid;
      if (repairedApplied) {
        logger.info('llm_output_repaired', {
          request_id: requestId,
          raw_schema_valid: repair.rawSchemaValid,
          used_repair: !repair.rawSchemaValid
        });
        output = repair.repaired;
      } else {
        logger.warn('llm_output_fallback_used', {
          request_id: requestId,
          reason: !repair.hasUsableReply ? 'missing_reply_text' : 'inconsistent_output_after_repair',
          issues: repair.finalIssues,
          raw_output_summary: summarizeRawOutput(raw)
        });
        output = fallbackOutput(normalized);
      }
    } catch (error) {
      if (error.code === 'PROVIDER_ERROR' || error.code === 'PROVIDER_TIMEOUT') {
        throw error;
      }
      logger.warn('llm_unexpected_error', { request_id: requestId, code: error.code || 'UNKNOWN' });
      logger.warn('llm_output_fallback_used', { request_id: requestId, reason: 'unexpected_error' });
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
