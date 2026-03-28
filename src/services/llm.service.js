const https = require('https');
const { HttpError } = require('../lib/http-error');

function extractOutputText(parsed) {
  if (!parsed || !Array.isArray(parsed.output)) return '';
  const first = parsed.output[0];
  const content = first && first.content;
  if (!Array.isArray(content) || !content[0]) return '';
  return content[0].text || '';
}

function createLlmService({ env, modelConfig, logger }) {
  async function generateStructuredJson({ systemPrompt, userPayload, requestId }) {
    const requestBody = JSON.stringify({
      model: modelConfig.model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload) }
      ]
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.openai.com',
          path: '/v1/responses',
          method: 'POST',
          timeout: modelConfig.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Length': Buffer.byteLength(requestBody)
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 500) {
              return reject(new HttpError(503, 'LLM_UPSTREAM_UNAVAILABLE', 'LLM provider unavailable'));
            }
            if (res.statusCode >= 400) {
              logger.warn('llm client error', { request_id: requestId, status: res.statusCode });
              return reject(new HttpError(502, 'LLM_UPSTREAM_ERROR', 'LLM provider returned an error'));
            }

            try {
              const parsed = JSON.parse(data);
              const text = extractOutputText(parsed);
              if (!text) {
                return reject(new HttpError(502, 'EMPTY_LLM_OUTPUT', 'LLM returned empty output'));
              }
              const json = JSON.parse(text);
              return resolve(json);
            } catch (error) {
              return reject(new HttpError(502, 'INVALID_LLM_OUTPUT', 'LLM output was not valid JSON'));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new HttpError(503, 'LLM_TIMEOUT', 'LLM request timed out'));
      });

      req.on('error', (error) => {
        if (error instanceof HttpError) {
          return reject(error);
        }
        logger.error('llm network error', { request_id: requestId, error: error.message });
        return reject(new HttpError(503, 'LLM_NETWORK_ERROR', 'Could not reach LLM provider'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  return { generateStructuredJson };
}

module.exports = { createLlmService };
