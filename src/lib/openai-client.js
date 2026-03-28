async function parseProviderErrorBody(res) {
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await res.json();
    const text = await res.text();
    return text ? { message: text } : null;
  } catch (_error) {
    return null;
  }
}

function extractProviderCode(providerBody) {
  if (!providerBody || typeof providerBody !== 'object') return null;
  if (providerBody.error && typeof providerBody.error === 'object') {
    return providerBody.error.code || providerBody.error.type || null;
  }
  return providerBody.code || null;
}

async function createResponse({ apiKey, body, timeout }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const providerBody = await parseProviderErrorBody(res);
      const e = new Error(`Provider status ${res.status}`);
      e.status = res.status;
      e.providerRequestId = res.headers.get('x-request-id') || null;
      e.providerBody = providerBody;
      e.providerCode = extractProviderCode(providerBody);
      throw e;
    }
    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const e = new Error('Timeout');
      e.code = 'ETIMEDOUT';
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { createResponse };
