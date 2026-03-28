const { NormalizedChatRequestSchema } = require('../schemas/normalized-chat-request.schema');

function cleanText(text, max = 5000) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function inferSector(payload, env) {
  if (payload.sector) return cleanText(payload.sector, 60).toLowerCase();
  const winery = payload.winery || {};
  const name = `${winery.name || ''} ${winery.short_description || ''}`.toLowerCase();
  if (name.includes('vino') || name.includes('bodega') || name.includes('celler')) return 'winery';
  if (name.includes('hotel')) return 'hospitality';
  return (env.DEFAULT_SECTOR || 'generic').toLowerCase();
}

function normalizePayload(payload, env) {
  const winery = payload.winery || {};
  const business = payload.businessContext || {};
  const lead = payload.lead || payload.leadContext || {};
  const experiences = payload.experiences || payload.offers || [];
  const conversation = payload.messages || payload.conversation || [];
  const sector = inferSector(payload, env);

  const normalized = {
    language: cleanText(payload.language || 'es', 5),
    scenario: cleanText(payload.scenario || 'default', 120),
    sector,
    businessContext: {
      type: sector,
      name: cleanText(winery.name || business.name || '', 120) || null,
      slug: cleanText(winery.slug || business.slug || '', 120) || null,
      brandTone: cleanText(winery.brand_tone || business.brandTone || '', 500) || null,
      briefHistory: cleanText(winery.brief_history || business.briefHistory || '', 2000) || null,
      shortDescription: cleanText(winery.short_description || business.shortDescription || '', 2000) || null,
      valueProposition: cleanText(winery.value_proposition || business.valueProposition || '', 2000) || null,
      faqs: Array.isArray(winery.faqs) ? winery.faqs.slice(0, 50).map((v) => cleanText(v, 500)) : [],
      recommendationRules: Array.isArray(winery.recommendation_rules) ? winery.recommendation_rules.slice(0, 50).map((v) => cleanText(v, 500)) : [],
      objectionRules: Array.isArray(winery.objection_rules) ? winery.objection_rules.slice(0, 50).map((v) => cleanText(v, 500)) : [],
      metadata: payload.metadata || {}
    },
    offers: experiences.slice(0, 100).map((exp) => ({
      id: String(exp.id || '').slice(0, 120),
      title: {
        ca: cleanText(exp.title_ca, 180),
        es: cleanText(exp.title_es, 180),
        en: cleanText(exp.title_en, 180)
      },
      description: {
        ca: cleanText(exp.description_ca, 2000),
        es: cleanText(exp.description_es, 2000),
        en: cleanText(exp.description_en, 2000)
      },
      price: Number.isFinite(exp.price) ? exp.price : null,
      currency: cleanText(exp.currency, 12) || null,
      duration: cleanText(exp.duration, 60) || null,
      min_people: Number.isInteger(exp.min_people) ? exp.min_people : null,
      max_people: Number.isInteger(exp.max_people) ? exp.max_people : null
    })),
    leadContext: {
      name: cleanText(lead.name || '', 120) || null,
      email: cleanText(lead.email || '', 160) || null,
      phone: cleanText(lead.phone || '', 40) || null
    },
    conversation: conversation.slice(0, 60).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(m.content, 2500)
    }))
  };

  return NormalizedChatRequestSchema.parse(normalized);
}

module.exports = { normalizePayload, cleanText, inferSector };
