const { z } = require('../lib/zod-lite');

const PublicChatResponseSchema = z.object({
  reply_text: z.string(),
  language: z.string(),
  detected_intent: z.string(),
  people_count: z.number().int().nullable(),
  recommended_experience_id: z.string().nullable(),
  alternative_experience_id: z.string().nullable(),
  objection_detected: z.string(),
  lead_stage: z.string(),
  next_step: z.string(),
  ask_for_contact: z.boolean(),
  conversation_summary: z.string().nullable(),
  lead_name: z.string().nullable(),
  lead_email: z.string().nullable(),
  lead_phone: z.string().nullable(),
  desired_date: z.string().nullable(),
  fields_to_update: z.record(z.any())
});

module.exports = { PublicChatResponseSchema };
