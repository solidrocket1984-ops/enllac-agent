const { z } = require('../lib/zod-lite');

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(6000)
});

const WinerySchema = z.object({
  name: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  brand_tone: z.string().max(500).optional(),
  brief_history: z.string().max(2000).optional(),
  short_description: z.string().max(2000).optional(),
  value_proposition: z.string().max(2000).optional(),
  faqs: z.array(z.string().max(500)).max(50).optional(),
  recommendation_rules: z.array(z.string().max(500)).max(50).optional(),
  objection_rules: z.array(z.string().max(500)).max(50).optional()
}).strict();

const ExperienceSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title_ca: z.string().max(180).optional(),
  title_es: z.string().max(180).optional(),
  title_en: z.string().max(180).optional(),
  description_ca: z.string().max(2000).optional(),
  description_es: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().max(12).optional(),
  duration: z.string().max(60).optional(),
  min_people: z.number().int().nonnegative().optional(),
  max_people: z.number().int().nonnegative().optional()
}).strict();

const LeadSchema = z.object({
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional()
}).strict();

const BusinessContextSchema = z.object({
  type: z.string().max(60).optional(),
  name: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional()
}).passthrough();

const PublicChatRequestSchema = z.object({
  language: z.string().max(5).optional(),
  scenario: z.string().max(120).optional(),
  sector: z.string().max(60).optional(),
  winery: WinerySchema.optional(),
  experiences: z.array(ExperienceSchema).max(100).optional(),
  lead: LeadSchema.optional(),
  messages: z.array(MessageSchema).min(1).max(60),
  businessContext: BusinessContextSchema.optional(),
  offers: z.array(z.any()).max(100).optional(),
  leadContext: z.record(z.any()).optional(),
  conversation: z.array(MessageSchema).max(60).optional(),
  metadata: z.record(z.any()).optional()
}).strict();

module.exports = { PublicChatRequestSchema };
