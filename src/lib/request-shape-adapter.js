function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

function emptyToNull(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function listFromUnknown(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[;,|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function adaptLead(rawLead) {
  const lead = isObject(rawLead) ? rawLead : {};
  return {
    ...lead,
    name: emptyToNull(lead.name),
    email: emptyToNull(lead.email),
    phone: emptyToNull(lead.phone)
  };
}

function adaptWinery(rawWinery) {
  const winery = isObject(rawWinery) ? rawWinery : {};
  return {
    ...winery,
    faqs: listFromUnknown(winery.faqs),
    recommendation_rules: listFromUnknown(winery.recommendation_rules),
    objection_rules: listFromUnknown(winery.objection_rules)
  };
}

function sanitizeConversation(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((msg) => (isObject(msg) ? msg : {}))
    .filter((msg) => typeof msg.content === 'string' && msg.content.trim())
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: cleanString(msg.content)
    }));
}

function adaptPublicRequestShape(rawBody) {
  const body = isObject(rawBody) ? rawBody : {};

  const winery = adaptWinery(body.winery);
  const lead = adaptLead(body.lead || body.leadContext);
  const conversation = sanitizeConversation(body.messages || body.conversation);

  return {
    ...body,
    winery,
    lead,
    leadContext: body.leadContext,
    messages: conversation,
    conversation,
    metadata: isObject(body.metadata) ? body.metadata : {}
  };
}

module.exports = {
  adaptPublicRequestShape,
  listFromUnknown,
  emptyToNull,
  sanitizeConversation
};
