const { z } = require('../lib/zod-lite');

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']).optional(),
  content: z.string().trim().min(1).max(6000)
}).passthrough();

const WinerySchema = z.object({
  name: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  brand_tone: z.string().max(500).optional(),
  brief_history: z.string().max(2000).optional(),
  short_description: z.string().max(2000).optional(),
  value_proposition: z.string().max(2000).optional(),
  faqs: z.union([z.array(z.string().max(500)).max(50), z.string().max(10000)]).optional(),
  recommendation_rules: z.union([z.array(z.string().max(500)).max(50), z.string().max(10000)]).optional(),
  objection_rules: z.union([z.array(z.string().max(500)).max(50), z.string().max(10000)]).optional()
}).passthrough();

const ExperienceSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().max(180).optional(),
  description: z.string().max(2000).optional(),
  title_ca: z.string().max(180).optional(),
  title_es: z.string().max(180).optional(),
  title_en: z.string().max(180).optional(),
  description_ca: z.string().max(2000).optional(),
  description_es: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  price: z.union([z.number().nonnegative(), z.string()]).optional(),
  currency: z.string().max(12).optional(),
  duration: z.string().max(60).optional(),
  min_people: z.union([z.number().int().nonnegative(), z.string()]).optional(),
  max_people: z.union([z.number().int().nonnegative(), z.string()]).optional(),
  winery_id: z.union([z.string(), z.number()]).optional(),
  active: z.union([z.boolean(), z.string()]).optional()
}).passthrough();

const LeadSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.union([z.string().email().max(160), z.string().max(160), z.any()]).nullable().optional()
}).passthrough();

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
  messages: z.array(MessageSchema).max(60).optional(),
  businessContext: BusinessContextSchema.optional(),
  offers: z.array(z.any()).max(100).optional(),
  leadContext: z.record(z.any()).optional(),
  conversation: z.array(MessageSchema).max(60).optional(),
  metadata: z.record(z.any()).optional()
}).passthrough();

module.exports = { PublicChatRequestSchema };
