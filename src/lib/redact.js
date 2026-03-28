function redactEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
}

function redactPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D+/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

function summarizePayload(payload) {
  const lead = payload.lead || payload.leadContext || {};
  return {
    language: payload.language,
    sector: payload.sector,
    messages_count: Array.isArray(payload.messages) ? payload.messages.length : (Array.isArray(payload.conversation) ? payload.conversation.length : 0),
    offers_count: Array.isArray(payload.experiences) ? payload.experiences.length : (Array.isArray(payload.offers) ? payload.offers.length : 0),
    lead_email: redactEmail(lead.email),
    lead_phone: redactPhone(lead.phone)
  };
}

module.exports = { redactEmail, redactPhone, summarizePayload };
