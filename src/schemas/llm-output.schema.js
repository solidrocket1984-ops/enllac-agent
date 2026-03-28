const { z } = require('../lib/zod-lite');

const RawLlmOutputSchema = z.object({
  reply_text: z.string().max(4000).optional(),
  language: z.string().min(2).max(5).optional(),
  detected_intent: z.string().max(80).optional(),
  people_count: z.union([z.number().int().min(1).max(100), z.string().max(10)]).nullable().optional(),
  recommended_experience_id: z.union([z.string().max(120), z.number()]).nullable().optional(),
  alternative_experience_id: z.union([z.string().max(120), z.number()]).nullable().optional(),
  objection_detected: z.string().max(120).optional(),
  lead_stage: z.string().max(120).optional(),
  next_step: z.string().max(120).optional(),
  ask_for_contact: z.boolean().optional(),
  conversation_summary: z.string().max(1000).nullable().optional(),
  lead_name: z.string().max(120).nullable().optional(),
  lead_email: z.string().max(160).nullable().optional(),
  lead_phone: z.string().max(40).nullable().optional(),
  desired_date: z.string().max(50).nullable().optional(),
  fields_to_update: z.record(z.any()).optional()
}).passthrough();

const LlmOutputSchema = z.object({
  reply_text: z.string().min(1).max(4000),
  language: z.string().min(2).max(5),
  detected_intent: z.string().min(1).max(80),
  people_count: z.number().int().min(1).max(100).nullable().optional(),
  recommended_experience_id: z.string().max(120).nullable().optional(),
  alternative_experience_id: z.string().max(120).nullable().optional(),
  objection_detected: z.string().max(120),
  lead_stage: z.string().max(120),
  next_step: z.string().max(120),
  ask_for_contact: z.boolean(),
  conversation_summary: z.string().max(1000).nullable().optional(),
  lead_name: z.string().max(120).nullable().optional(),
  lead_email: z.string().email().max(160).nullable().optional(),
  lead_phone: z.string().max(40).nullable().optional(),
  desired_date: z.string().max(50).nullable().optional(),
  fields_to_update: z.record(z.any()).default({})
}).strict();

module.exports = { RawLlmOutputSchema, LlmOutputSchema };
