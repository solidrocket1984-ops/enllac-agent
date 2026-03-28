const { getBaseSystemPrompt } = require('../prompts/base-system-prompt');
const { getWineryPrompt } = require('../prompts/sectors/winery');
const { getGenericPrompt } = require('../prompts/sectors/generic');

function outputSchemaHint() {
  return `JSON schema required:\n{
  "reply_text":"string",
  "language":"string",
  "detected_intent":"string",
  "people_count":number|null,
  "recommended_experience_id":"string"|null,
  "alternative_experience_id":"string"|null,
  "objection_detected":"string",
  "lead_stage":"string",
  "next_step":"string",
  "ask_for_contact":boolean,
  "conversation_summary":"string"|null,
  "lead_name":"string"|null,
  "lead_email":"string"|null,
  "lead_phone":"string"|null,
  "desired_date":"string"|null,
  "fields_to_update":{}
}`;
}

function buildSystemPrompt(sector) {
  const base = getBaseSystemPrompt();
  const sectorPrompt = sector === 'winery' ? getWineryPrompt() : getGenericPrompt();
  return `${base}\n${sectorPrompt}\n${outputSchemaHint()}`;
}

module.exports = { buildSystemPrompt };
