const { RawLlmOutputSchema, LlmOutputSchema } = require('../schemas/llm-output.schema');

function asTrimmedString(value, max = 4000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function asNullableString(value, max = 160) {
  if (value === null || value === undefined) return null;
  const text = asTrimmedString(String(value), max);
  return text || null;
}

function normalizeEmail(value) {
  const maybe = asNullableString(value, 160);
  if (!maybe) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(maybe) ? maybe : null;
}

function normalizePeopleCount(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function inferIntent(normalizedRequest) {
  const latest = (normalizedRequest?.conversation || []).slice(-1)[0];
  const text = `${latest?.content || ''}`.toLowerCase();
  if (/difer|compare|compar/i.test(text)) return 'comparison_request';
  if (/recom|aconsej|suger|millor|mejor/i.test(text)) return 'recommendation_request';
  if (/reserv|book|cita|quote|presupuesto/i.test(text)) return 'booking_or_quote';
  return 'general_query';
}

function inferLeadStage(normalizedRequest, intent) {
  if (intent === 'booking_or_quote') return 'qualified';
  if ((normalizedRequest?.conversation || []).length > 2) return 'engaged';
  return 'new';
}

function inferNextStep(intent) {
  if (intent === 'comparison_request') return 'clarify_preference_or_budget';
  if (intent === 'recommendation_request') return 'recommend_offer';
  if (intent === 'booking_or_quote') return 'collect_contact_for_follow_up';
  return 'continue_conversation';
}

function buildRepairResult(raw, normalizedRequest) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const rawParsed = RawLlmOutputSchema.safeParse(source);
  const base = rawParsed.success ? rawParsed.data : source;

  const repaired = {
    reply_text: asTrimmedString(base.reply_text || '', 4000),
    language: asTrimmedString(base.language || normalizedRequest.language, 5) || normalizedRequest.language,
    detected_intent: asTrimmedString(base.detected_intent || '', 80),
    people_count: normalizePeopleCount(base.people_count),
    recommended_experience_id: asNullableString(base.recommended_experience_id, 120),
    alternative_experience_id: asNullableString(base.alternative_experience_id, 120),
    objection_detected: asTrimmedString(base.objection_detected || 'none', 120) || 'none',
    lead_stage: asTrimmedString(base.lead_stage || '', 120),
    next_step: asTrimmedString(base.next_step || '', 120),
    ask_for_contact: typeof base.ask_for_contact === 'boolean' ? base.ask_for_contact : false,
    conversation_summary: asNullableString(base.conversation_summary, 1000),
    lead_name: asNullableString(base.lead_name ?? normalizedRequest?.leadContext?.name, 120),
    lead_email: normalizeEmail(base.lead_email),
    lead_phone: asNullableString(base.lead_phone ?? normalizedRequest?.leadContext?.phone, 40),
    desired_date: asNullableString(base.desired_date, 50),
    fields_to_update: base.fields_to_update && typeof base.fields_to_update === 'object' && !Array.isArray(base.fields_to_update)
      ? base.fields_to_update
      : {}
  };

  if (!repaired.detected_intent) repaired.detected_intent = inferIntent(normalizedRequest);
  if (!repaired.lead_stage) repaired.lead_stage = inferLeadStage(normalizedRequest, repaired.detected_intent);
  if (!repaired.next_step) repaired.next_step = inferNextStep(repaired.detected_intent);

  const finalParsed = LlmOutputSchema.safeParse(repaired);
  const hasUsableReply = Boolean(repaired.reply_text && repaired.reply_text.trim());

  return {
    rawSchemaValid: rawParsed.success,
    finalSchemaValid: finalParsed.success,
    hasUsableReply,
    repaired: finalParsed.success ? finalParsed.data : repaired,
    finalIssues: finalParsed.success ? [] : finalParsed.error.issues
  };
}

module.exports = { buildRepairResult };
