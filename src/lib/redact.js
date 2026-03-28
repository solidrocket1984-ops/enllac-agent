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
  return {
    language: payload.language,
    scenario: payload.scenario,
    messages_count: Array.isArray(payload.messages) ? payload.messages.length : 0,
    experiences_count: Array.isArray(payload.experiences) ? payload.experiences.length : 0,
    lead_email: redactEmail(payload.lead && payload.lead.email),
    lead_phone: redactPhone(payload.lead && payload.lead.phone)
  };
}

module.exports = { redactEmail, redactPhone, summarizePayload };
