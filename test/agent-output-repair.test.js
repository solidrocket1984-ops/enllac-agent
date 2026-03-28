const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentService } = require('../src/services/agent.service');
const { buildSystemPrompt } = require('../src/services/prompt-builder.service');

function buildEnv() {
  return {
    DEFAULT_SECTOR: 'generic'
  };
}

function basePayload(overrides = {}) {
  return {
    language: 'ca',
    sector: 'winery',
    businessContext: {
      type: 'winery',
      name: 'Celler Sol',
      brandTone: 'proper i elegant',
      shortDescription: 'Enoturisme familiar',
      valueProposition: 'Tasts guiats amb producte local',
      faqs: ['Obrim de dimarts a diumenge', 'Hi ha opcions sense alcohol'],
      recommendationRules: ['Si és primer cop, començar per opció estàndard'],
      objectionRules: ['Si preu alt, explicar què inclou premium']
    },
    offers: [
      { id: 'std', name: 'Visita Estàndard', description: 'Celler + 3 vins', price: 25, currency: 'EUR' },
      { id: 'prem', name: 'Visita Premium', description: 'Reserva + 5 vins', price: 49, currency: 'EUR' }
    ],
    leadContext: { name: 'Jana', email: '', phone: '' },
    conversation: [{ role: 'user', content: 'Bon dia, és el primer cop que contacto. Quin servei em recomanaríeu per començar?' }],
    ...overrides
  };
}

function createLoggerSpy() {
  const logs = [];
  return {
    logs,
    info: (msg, data) => logs.push({ level: 'info', msg, data }),
    warn: (msg, data) => logs.push({ level: 'warn', msg, data })
  };
}

async function runAgent(rawLlmOutput, payload = basePayload()) {
  const logger = createLoggerSpy();
  const agent = createAgentService({
    env: buildEnv(),
    logger,
    llmService: {
      generateStructuredJson: async () => rawLlmOutput
    }
  });

  const response = await agent.processChat(payload, 'req-test-1');
  return { response, logs: logger.logs };
}

test('1) respuesta válida rica -> no usa fallback', async () => {
  const { response, logs } = await runAgent({
    reply_text: 'Et recomano la Visita Estàndard per començar.',
    language: 'ca',
    detected_intent: 'recommendation_request',
    people_count: 2,
    recommended_experience_id: 'std',
    alternative_experience_id: 'prem',
    objection_detected: 'none',
    lead_stage: 'engaged',
    next_step: 'recommend_offer',
    ask_for_contact: false,
    fields_to_update: {}
  });

  assert.equal(response.reply_text.includes('Visita Estàndard'), true);
  assert.notEqual(response.detected_intent, 'fallback');
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), false);
});

test('2) reply_text válido + lead_email vacío -> se repara sin fallback', async () => {
  const { response, logs } = await runAgent({
    reply_text: 'Perfecte, et puc orientar amb les opcions.',
    language: 'ca',
    detected_intent: 'general_query',
    objection_detected: 'none',
    lead_stage: 'new',
    next_step: 'continue_conversation',
    ask_for_contact: false,
    lead_email: '',
    fields_to_update: {}
  });

  assert.equal(response.lead_email, null);
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), false);
});

test('3) people_count como string -> se repara sin fallback', async () => {
  const { response, logs } = await runAgent({
    reply_text: 'Per a 4 persones, l’opció premium funciona molt bé.',
    language: 'ca',
    detected_intent: 'recommendation_request',
    people_count: '4',
    objection_detected: 'none',
    lead_stage: 'engaged',
    next_step: 'recommend_offer',
    ask_for_contact: false,
    fields_to_update: {}
  });

  assert.equal(response.people_count, 4);
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), false);
});

test('4) recomendación inicial con offers -> recomienda algo concreto', async () => {
  const { response } = await runAgent({
    reply_text: 'Si és el vostre primer cop, us recomano la Visita Estàndard.',
    language: 'ca',
    detected_intent: 'recommendation_request',
    recommended_experience_id: 'std',
    objection_detected: 'none',
    lead_stage: 'engaged',
    next_step: 'recommend_offer',
    ask_for_contact: false,
    fields_to_update: {}
  });

  assert.equal(response.recommended_experience_id, 'std');
  assert.equal(response.reply_text.includes('recomano la Visita Estàndard'), true);
});

test('5) comparación estándar vs premium -> compara sin fallback', async () => {
  const { response, logs } = await runAgent({
    reply_text: 'L’estàndard inclou 3 vins i la premium 5 vins amb accés a reserva.',
    language: 'ca',
    detected_intent: 'comparison_request',
    recommended_experience_id: 'prem',
    alternative_experience_id: 'std',
    objection_detected: 'none',
    lead_stage: 'engaged',
    next_step: 'clarify_preference_or_budget',
    ask_for_contact: false,
    fields_to_update: {}
  }, basePayload({ conversation: [{ role: 'user', content: 'Quina diferència hi ha entre la vostra opció estàndard i la premium?' }] }));

  assert.equal(response.reply_text.includes('estàndard'), true);
  assert.equal(response.reply_text.includes('premium'), true);
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), false);
});

test('6) sin offers suficientes -> respuesta honesta útil sin inventar', async () => {
  const payload = basePayload({ offers: [], conversation: [{ role: 'user', content: 'Què em recomanes?' }] });
  const { response, logs } = await runAgent({
    reply_text: 'Encara no tinc ofertes concretes carregades, però et puc orientar segons el teu objectiu i pressupost.',
    language: 'ca',
    detected_intent: 'recommendation_request',
    objection_detected: 'none',
    lead_stage: 'new',
    next_step: 'clarify_preference_or_budget',
    ask_for_contact: false,
    fields_to_update: {}
  }, payload);

  assert.equal(response.reply_text.includes('no tinc ofertes concretes'), true);
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), false);
});

test('7) prompt builder incluye businessContext, FAQs, rules y offers', () => {
  const prompt = buildSystemPrompt(basePayload());
  assert.equal(prompt.includes('Business context:'), true);
  assert.equal(prompt.includes('FAQs:'), true);
  assert.equal(prompt.includes('Recommendation rules:'), true);
  assert.equal(prompt.includes('Objection rules:'), true);
  assert.equal(prompt.includes('Offers available:'), true);
  assert.equal(prompt.includes('id=std'), true);
  assert.equal(prompt.includes('id=prem'), true);
});

test('8) fallback solo cuando no hay reply_text usable', async () => {
  const { response, logs } = await runAgent({
    reply_text: '   ',
    language: 'ca',
    detected_intent: 'general_query',
    fields_to_update: {}
  });

  assert.equal(response.detected_intent, 'fallback');
  assert.equal(logs.some((l) => l.msg === 'llm_output_fallback_used'), true);
});
