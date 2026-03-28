const { NormalizedChatRequestSchema } = require('../schemas/normalized-chat-request.schema');
const { listFromUnknown, emptyToNull, sanitizeConversation } = require('./request-shape-adapter');

function cleanText(text, max = 5000) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function toNumberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIntOrNull(value) {
  const n = toNumberOrNull(value);
  return Number.isInteger(n) ? n : null;
}

function inferSector(payload, env) {
  if (payload.sector) return cleanText(payload.sector, 60).toLowerCase();

  const business = payload.businessContext || {};
  const businessTypeHints = `${business.type || ''} ${business.name || ''} ${business.description || ''}`.toLowerCase();
  if (businessTypeHints.includes('clinic') || businessTypeHints.includes('clinica')) return 'clinic';
  if (businessTypeHints.includes('hotel')) return 'hospitality';
  if (businessTypeHints.includes('tour') || businessTypeHints.includes('travel')) return 'tourism';

  const winery = payload.winery || {};
  const legacyHints = `${winery.name || ''} ${winery.short_description || ''}`.toLowerCase();
  if (legacyHints.includes('vino') || legacyHints.includes('bodega') || legacyHints.includes('celler')) return 'winery';

  return (env.DEFAULT_SECTOR || 'generic').toLowerCase() || 'generic';
}

function normalizeOffer(exp, idx, defaultLanguage) {
  const metadata = { ...exp };
  const id = cleanText(String(exp.id || `offer_${idx + 1}`), 120) || `offer_${idx + 1}`;

  const titleFallback = cleanText(exp.name || exp.title || '', 180);
  const descriptionFallback = cleanText(exp.description || '', 2000);

  return {
    id,
    title: {
      ca: cleanText(exp.title_ca, 180) || (defaultLanguage === 'ca' ? titleFallback : ''),
      es: cleanText(exp.title_es, 180) || (defaultLanguage === 'es' ? titleFallback : ''),
      en: cleanText(exp.title_en, 180) || (defaultLanguage === 'en' ? titleFallback : '')
    },
    description: {
      ca: cleanText(exp.description_ca, 2000) || (defaultLanguage === 'ca' ? descriptionFallback : ''),
      es: cleanText(exp.description_es, 2000) || (defaultLanguage === 'es' ? descriptionFallback : ''),
      en: cleanText(exp.description_en, 2000) || (defaultLanguage === 'en' ? descriptionFallback : '')
    },
    price: toNumberOrNull(exp.price),
    currency: cleanText(exp.currency, 12) || null,
    duration: cleanText(exp.duration, 60) || null,
    min_people: toIntOrNull(exp.min_people),
    max_people: toIntOrNull(exp.max_people),
    metadata
  };
}

function normalizePayload(payload, env) {
  const winery = payload.winery || {};
  const business = payload.businessContext || {};
  const lead = payload.lead || payload.leadContext || {};
  const experiences = Array.isArray(payload.experiences) ? payload.experiences : (Array.isArray(payload.offers) ? payload.offers : []);
  const conversation = sanitizeConversation(payload.messages || payload.conversation).slice(0, 60);
  const sector = inferSector(payload, env);
  const language = cleanText(payload.language || 'es', 5) || 'es';

  const normalized = {
    language,
    scenario: cleanText(payload.scenario || 'default', 120) || 'default',
    sector,
    businessContext: {
      type: cleanText(business.type || sector, 60) || sector,
      name: cleanText(winery.name || business.name || '', 120) || null,
      slug: cleanText(winery.slug || business.slug || '', 120) || null,
      brandTone: cleanText(winery.brand_tone || business.brandTone || '', 500) || null,
      briefHistory: cleanText(winery.brief_history || business.briefHistory || '', 2000) || null,
      shortDescription: cleanText(winery.short_description || business.shortDescription || business.description || '', 2000) || null,
      valueProposition: cleanText(winery.value_proposition || business.valueProposition || '', 2000) || null,
      faqs: listFromUnknown(winery.faqs).slice(0, 50).map((v) => cleanText(v, 500)).filter(Boolean),
      recommendationRules: listFromUnknown(winery.recommendation_rules).slice(0, 50).map((v) => cleanText(v, 500)).filter(Boolean),
      objectionRules: listFromUnknown(winery.objection_rules).slice(0, 50).map((v) => cleanText(v, 500)).filter(Boolean),
      metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
    },
    offers: experiences.slice(0, 100).map((exp, idx) => normalizeOffer(exp && typeof exp === 'object' ? exp : {}, idx, language)),
    leadContext: {
      name: emptyToNull(cleanText(lead.name || '', 120)),
      email: emptyToNull(cleanText(lead.email || '', 160)),
      phone: emptyToNull(cleanText(lead.phone || '', 40))
    },
    conversation,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  };

  return NormalizedChatRequestSchema.parse(normalized);
}

module.exports = { normalizePayload, cleanText, inferSector };
