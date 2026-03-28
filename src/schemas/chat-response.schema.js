const { HttpError } = require('../lib/http-error');

const REQUIRED_FIELDS = [
  'reply_text', 'language', 'detected_intent', 'people_count', 'recommended_experience_id',
  'alternative_experience_id', 'objection_detected', 'lead_stage', 'next_step', 'ask_for_contact',
  'conversation_summary', 'lead_name', 'lead_email', 'lead_phone', 'desired_date', 'fields_to_update'
];

function validatePublicResponse(payload) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in payload)) {
      throw new HttpError(500, 'INVALID_PUBLIC_RESPONSE', `Missing response field: ${field}`);
    }
  }
  return true;
}

module.exports = { validatePublicResponse };
