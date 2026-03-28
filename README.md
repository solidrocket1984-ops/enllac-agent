# enllac-agent

Backend conversacional de `DemoEnllacDigital` reforzado para producción en Render, con compatibilidad retroactiva y contrato canónico interno.

## Endpoints finales
- `GET /` estado básico.
- `GET /healthz` liveness real.
- `GET /readyz` readiness (configuración + proveedor listo).
- `POST /v1/chat` endpoint canónico.
- `POST /chat` alias compatible.
- `POST /` alias legacy.

## Contratos soportados

### Request público aceptado (legacy + nuevo)
Se aceptan **ambas familias** de payload:

1) Legacy frontend actual:
- `language`
- `scenario`
- `sector`
- `winery`
- `experiences`
- `lead`
- `messages`

2) Nuevo normalizado de integración:
- `language`
- `scenario`
- `sector`
- `businessContext`
- `offers`
- `leadContext`
- `conversation`
- `metadata`

### Tolerancias implementadas
- `winery.faqs`: array/string/null.
- `winery.recommendation_rules`: array/string/null.
- `winery.objection_rules`: array/string/null.
- `lead.email`, `lead.phone`, `lead.name`: `""` => `null`.
- `experiences`: shape legacy multilenguaje **o** shape simplificado (`id`, `name`, `description`, `price`, `active`, `winery_id`).
- `messages`/`conversation`: se limpian, recortan y normalizan a roles `user|assistant`.

### Shape canónico interno
Siempre se normaliza a:

```json
{
  "language": "es",
  "scenario": "default",
  "sector": "generic",
  "businessContext": {
    "type": "generic",
    "name": null,
    "slug": null,
    "brandTone": null,
    "briefHistory": null,
    "shortDescription": null,
    "valueProposition": null,
    "faqs": [],
    "recommendationRules": [],
    "objectionRules": [],
    "metadata": {}
  },
  "offers": [
    {
      "id": "offer_1",
      "title": { "ca": "", "es": "", "en": "" },
      "description": { "ca": "", "es": "", "en": "" },
      "price": null,
      "currency": null,
      "duration": null,
      "min_people": null,
      "max_people": null,
      "metadata": {}
    }
  ],
  "leadContext": {
    "name": null,
    "email": null,
    "phone": null
  },
  "conversation": [
    { "role": "user", "content": "..." }
  ],
  "metadata": {}
}
```

### Response pública (estable)
```json
{
  "reply_text": "...",
  "language": "es",
  "detected_intent": "...",
  "people_count": null,
  "recommended_experience_id": null,
  "alternative_experience_id": null,
  "objection_detected": "none",
  "lead_stage": "new",
  "next_step": "continue_conversation",
  "ask_for_contact": false,
  "conversation_summary": null,
  "lead_name": null,
  "lead_email": null,
  "lead_phone": null,
  "desired_date": null,
  "fields_to_update": {},
  "_meta": {
    "request_id": "...",
    "sector": "...",
    "compatibility_mode": true
  }
}
```

## Headers, CORS y transición
### Header canónico de trazabilidad
- **Canónico**: `X-Request-Id`
- **Compatibilidad temporal**: `X-Demo-Request-Id`

Si llega `X-Demo-Request-Id` y no llega `X-Request-Id`, el backend reutiliza ese valor y responde con `x-request-id`.

### Token compartido
Si `AGENT_SHARED_TOKEN` está definido:
- Principal: `x-agent-token`
- Compatibilidad temporal: `Authorization: Bearer <token>`

### CORS
- Allowlist por `ALLOWED_ORIGINS` (CSV).
- Headers permitidos:
  - `Content-Type`
  - `Authorization`
  - `X-Request-Id`
  - `X-Agent-Token`
  - `X-Demo-Request-Id` (transitorio)

## Timeouts y errores
- `OPENAI_TIMEOUT_MS`: default `30000`.
- Errores consistentes:
  - `INVALID_BODY`
  - `MISSING_AUTH_TOKEN`
  - `INVALID_AUTH_TOKEN`
  - `FORBIDDEN_ORIGIN`
  - `PROVIDER_TIMEOUT`
  - `PROVIDER_ERROR`
  - `INTERNAL_ERROR`

Formato estándar:
```json
{ "ok": false, "error": { "code": "...", "message": "...", "request_id": "..." } }
```

## Resolución de sector
Orden:
1. `payload.sector`
2. pistas de `businessContext`
3. heurística legacy sobre `winery`
4. `DEFAULT_SECTOR`
5. fallback `generic`

Sectores incluidos:
- `generic`
- `winery`
- `clinic`
- `professional_services`
- `local_business`
- `hospitality`
- `tourism`
- `ecommerce_retail`

## Variables de entorno
- `PORT` (default `3000`)
- `NODE_ENV` (`development|test|production`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_MS` (default `30000`)
- `ALLOWED_ORIGINS` (CSV)
- `AGENT_SHARED_TOKEN`
- `DEFAULT_SECTOR` (default `generic`)
- `RATE_LIMIT_WINDOW_MS` (default `60000`)
- `RATE_LIMIT_MAX` (default `60`)
- `BODY_LIMIT` (default `250kb`)
- `LOG_LEVEL` (`debug|info|warn|error`)
- `APP_NAME`

## Scripts
```bash
npm run dev
npm start
npm test
npm run test:watch
npm run lint
```

## Despliegue Render
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`
- Readiness recomendado: `/readyz`
- `trust proxy` activado para entorno behind-proxy (Render).

## Curl de ejemplo
```bash
curl -X POST http://localhost:3000/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Request-Id: req-123' \
  -d '{
    "language": "es",
    "winery": {"name": "Celler Demo", "faqs": "Horario 10-18"},
    "experiences": [{"id": 1, "name": "Cata Premium", "price": "45"}],
    "lead": {"email": ""},
    "messages": [{"role": "user", "content": "Busco plan para 2"}]
  }'
```

## Compatibilidad con DemoEnllacDigital
- Se mantiene `/chat`.
- Se soporta shape legacy.
- Se conserva response pública legacy.
- Se incorpora contrato canónico interno robusto para evolución multi-sector sin romper frontend actual.
