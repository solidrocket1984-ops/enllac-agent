const { z } = require('../lib/zod-lite');

const NormalizedMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2500)
});

const LocalizedTextSchema = z.object({
  ca: z.string().default(''),
  es: z.string().default(''),
  en: z.string().default('')
});

const NormalizedOfferSchema = z.object({
  id: z.string().min(1),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema,
  price: z.number().nullable(),
  currency: z.string().nullable(),
  duration: z.string().nullable(),
  min_people: z.number().int().nullable(),
  max_people: z.number().int().nullable(),
  metadata: z.record(z.any()).default({})
});

const NormalizedChatRequestSchema = z.object({
  language: z.string().max(5),
  scenario: z.string().max(120),
  sector: z.string().max(60),
  businessContext: z.object({
    type: z.string().max(60),
    name: z.string().nullable(),
    slug: z.string().nullable(),
    brandTone: z.string().nullable(),
    briefHistory: z.string().nullable(),
    shortDescription: z.string().nullable(),
    valueProposition: z.string().nullable(),
    faqs: z.array(z.string()),
    recommendationRules: z.array(z.string()),
    objectionRules: z.array(z.string()),
    metadata: z.record(z.any()).default({})
  }),
  offers: z.array(NormalizedOfferSchema).max(100),
  leadContext: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable()
  }),
  conversation: z.array(NormalizedMessageSchema).min(1).max(60),
  metadata: z.record(z.any()).default({})
});

module.exports = { NormalizedChatRequestSchema };
