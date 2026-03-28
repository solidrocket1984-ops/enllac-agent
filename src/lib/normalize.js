function truncate(text, max = 5000) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, max);
}

function normalizePayload(input, env) {
  const messages = (input.messages || []).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: truncate(item.content, 2500)
  }));

  const hasWinery = !!input.winery;
  const sector = input.sector || input.business_type || (hasWinery ? 'winery' : env.DEFAULT_SECTOR || 'generic');

  const businessContext = hasWinery
    ? {
        type: 'winery',
        name: truncate(input.winery.name, 120),
        slug: truncate(input.winery.slug, 120),
        brandTone: truncate(input.winery.brand_tone, 500),
        briefHistory: truncate(input.winery.brief_history, 1000),
        shortDescription: truncate(input.winery.short_description, 1000),
        valueProposition: truncate(input.winery.value_proposition, 1000),
        faqs: Array.isArray(input.winery.faqs) ? input.winery.faqs.slice(0, 25) : [],
        recommendationRules: Array.isArray(input.winery.recommendation_rules) ? input.winery.recommendation_rules.slice(0, 25) : [],
        objectionRules: Array.isArray(input.winery.objection_rules) ? input.winery.objection_rules.slice(0, 25) : []
      }
    : {
        type: sector,
        name: truncate((input.businessContext && input.businessContext.name) || '', 120)
      };

  const offers = (input.experiences || []).slice(0, 50).map((exp) => ({
    id: String(exp.id || ''),
    price: typeof exp.price === 'number' ? exp.price : null,
    currency: truncate(exp.currency, 12),
    duration: truncate(exp.duration, 60),
    min_people: Number.isFinite(exp.min_people) ? exp.min_people : null,
    max_people: Number.isFinite(exp.max_people) ? exp.max_people : null,
    title: {
      ca: truncate(exp.title_ca, 180),
      es: truncate(exp.title_es, 180),
      en: truncate(exp.title_en, 180)
    },
    description: {
      ca: truncate(exp.description_ca, 1000),
      es: truncate(exp.description_es, 1000),
      en: truncate(exp.description_en, 1000)
    }
  }));

  return {
    language: truncate(input.language || 'es', 5),
    scenario: truncate(input.scenario || 'default', 120),
    sector,
    businessContext,
    offers,
    leadContext: {
      name: truncate(input.lead && input.lead.name, 120) || null,
      email: truncate(input.lead && input.lead.email, 160) || null,
      phone: truncate(input.lead && input.lead.phone, 40) || null
    },
    messages
  };
}

function toPublicResponse(internal, normalizedInput) {
  return {
    reply_text: internal.reply_text || 'Gracias por tu mensaje. ¿Quieres que te recomiende una experiencia?',
    language: internal.language || normalizedInput.language || 'es',
    detected_intent: internal.detected_intent || 'general_query',
    people_count: Number.isFinite(internal.people_count) ? internal.people_count : null,
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
    fields_to_update: (internal.fields_to_update && typeof internal.fields_to_update === 'object') ? internal.fields_to_update : {}
  };
}

module.exports = { normalizePayload, toPublicResponse, truncate };
