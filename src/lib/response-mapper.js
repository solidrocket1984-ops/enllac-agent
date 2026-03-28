const { PublicChatResponseSchema } = require('../schemas/public-chat-response.schema');

function toPublicResponse(internal, normalizedInput) {
  const response = {
    reply_text: internal.reply_text || 'Gracias por tu mensaje. ¿Quieres que te recomiende una opción?',
    language: internal.language || normalizedInput.language,
    detected_intent: internal.detected_intent || 'general_query',
    people_count: Number.isInteger(internal.people_count) ? internal.people_count : null,
    recommended_experience_id: internal.recommended_experience_id || null,
    alternative_experience_id: internal.alternative_experience_id || null,
    objection_detected: internal.objection_detected || 'none',
    lead_stage: internal.lead_stage || 'new',
    next_step: internal.next_step || 'continue_conversation',
    ask_for_contact: Boolean(internal.ask_for_contact),
    conversation_summary: internal.conversation_summary || null,
    lead_name: internal.lead_name || normalizedInput.leadContext.name || null,
    lead_email: internal.lead_email || normalizedInput.leadContext.email || null,
    lead_phone: internal.lead_phone || normalizedInput.leadContext.phone || null,
    desired_date: internal.desired_date || null,
    fields_to_update: internal.fields_to_update && typeof internal.fields_to_update === 'object' ? internal.fields_to_update : {}
  };
  return PublicChatResponseSchema.parse(response);
}

module.exports = { toPublicResponse };
