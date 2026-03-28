const { HttpError } = require('../lib/http-error');

const REQUIRED_STRING_FIELDS = [
  'reply_text',
  'language',
  'detected_intent',
  'objection_detected',
  'lead_stage',
  'next_step'
];

function validateLlmOutput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(502, 'INVALID_LLM_OUTPUT', 'LLM output is not a valid JSON object');
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof value[field] !== 'string' || !value[field].trim()) {
      throw new HttpError(502, 'INVALID_LLM_OUTPUT', `Missing or invalid field from LLM output: ${field}`);
    }
  }

  if (!('ask_for_contact' in value) || typeof value.ask_for_contact !== 'boolean') {
    throw new HttpError(502, 'INVALID_LLM_OUTPUT', 'ask_for_contact must be a boolean');
  }

  return true;
}

module.exports = { validateLlmOutput };
