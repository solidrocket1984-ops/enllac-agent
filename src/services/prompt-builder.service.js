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

function buildSystemPrompt(sector) {
  const sectorPrompt = sectorPrompts[sector] || generic;
  return `${basePrompt}\n\n${sectorPrompt}`;
}

module.exports = { buildSystemPrompt };
