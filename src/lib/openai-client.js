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
      const e = new Error(`Provider status ${res.status}`);
      e.status = res.status;
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
