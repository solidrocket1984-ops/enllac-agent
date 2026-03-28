const basePrompt = require('../prompts/base-system-prompt');
const generic = require('../prompts/sectors/generic');
const winery = require('../prompts/sectors/winery');
const clinic = require('../prompts/sectors/clinic');
const professionalServices = require('../prompts/sectors/professional_services');
const localBusiness = require('../prompts/sectors/local_business');
const hospitality = require('../prompts/sectors/hospitality');
const tourism = require('../prompts/sectors/tourism');
const ecommerceRetail = require('../prompts/sectors/ecommerce_retail');

const sectorPrompts = {
  generic,
  winery,
  clinic,
  professional_services: professionalServices,
  local_business: localBusiness,
  hospitality,
  tourism,
  ecommerce_retail: ecommerceRetail
};

function textOrFallback(value, fallback = 'not_provided') {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  return text || fallback;
}

function summarizeOffers(offers, language) {
  if (!Array.isArray(offers) || offers.length === 0) {
    return 'No offers were provided in this request. Do not invent offers. Provide useful guidance with available business context.';
  }

  return offers.slice(0, 8).map((offer, idx) => {
    const title = textOrFallback(offer?.title?.[language] || offer?.title?.es || offer?.title?.en || offer?.title?.ca || null, `offer_${idx + 1}`);
    const description = textOrFallback(offer?.description?.[language] || offer?.description?.es || offer?.description?.en || offer?.description?.ca || null, 'no_description');
    const price = Number.isFinite(offer?.price) ? String(offer.price) : 'n/a';
    const currency = textOrFallback(offer?.currency, 'n/a');
    const duration = textOrFallback(offer?.duration, 'n/a');
    const minPeople = Number.isInteger(offer?.min_people) ? String(offer.min_people) : 'n/a';
    const maxPeople = Number.isInteger(offer?.max_people) ? String(offer.max_people) : 'n/a';
    return `- id=${offer.id}; title=${title}; description=${description}; price=${price}; currency=${currency}; duration=${duration}; min_people=${minPeople}; max_people=${maxPeople}`;
  }).join('\n');
}

function listBlock(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) return `- ${emptyText}`;
  return items.slice(0, 20).map((item) => `- ${item}`).join('\n');
}

function buildSystemPrompt(normalizedPayload) {
  const sector = normalizedPayload?.sector || 'generic';
  const sectorPrompt = sectorPrompts[sector] || generic;
  const businessContext = normalizedPayload?.businessContext || {};
  const offers = normalizedPayload?.offers || [];
  const language = normalizedPayload?.language || 'es';

  const businessBlock = `Business context:\n- sector: ${textOrFallback(sector)}\n- business_name: ${textOrFallback(businessContext.name, 'unknown')}\n- brand_tone: ${textOrFallback(businessContext.brandTone, 'default professional tone')}\n- short_description: ${textOrFallback(businessContext.shortDescription, 'not_provided')}\n- value_proposition: ${textOrFallback(businessContext.valueProposition, 'not_provided')}\n- metadata_keys: ${Object.keys(businessContext.metadata || {}).slice(0, 15).join(', ') || 'none'}`;

  const faqsBlock = `FAQs:\n${listBlock(businessContext.faqs, 'No FAQs provided.')}`;
  const recommendationRulesBlock = `Recommendation rules:\n${listBlock(businessContext.recommendationRules, 'No recommendation rules provided.')}`;
  const objectionRulesBlock = `Objection rules:\n${listBlock(businessContext.objectionRules, 'No objection rules provided.')}`;
  const offersBlock = `Offers available:\n${summarizeOffers(offers, language)}`;

  const behaviorRules = `Behavior rules:\n- Answer in language=${language}.\n- Use offers when present to recommend concrete options.\n- If user asks differences between options (e.g. standard vs premium), compare available offers explicitly.\n- If comparison data is incomplete, state limits honestly.\n- Do not ask generic people/date questions before answering the current user question with available data.\n- Only ask for contact details when next_step truly requires booking/quotation/follow-up.`;

  return [
    basePrompt,
    sectorPrompt,
    businessBlock,
    faqsBlock,
    recommendationRulesBlock,
    objectionRulesBlock,
    offersBlock,
    behaviorRules
  ].join('\n\n');
}

module.exports = { buildSystemPrompt };
