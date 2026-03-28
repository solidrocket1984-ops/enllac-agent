# enllac-agent

Backend de agente conversacional para `DemoEnllacDigital`, preparado para Render con enfoque de producción.

## Qué hace
- Expone endpoints de chat compatibles con el frontend actual.
- Normaliza payload legacy (winery/experiences/lead/messages) a dominio interno neutral.
- Selecciona prompt por sector (`winery`, `clinic`, etc.).
- Llama al proveedor LLM y devuelve respuesta pública compatible.

## Endpoints
- `GET /` estado básico.
- `GET /healthz` liveness.
- `GET /readyz` readiness (configuración LLM).
- `POST /v1/chat` endpoint canónico.
- `POST /chat` alias compatible.
- `POST /` alias legacy compatible.

## Contrato request (público)
Campos esperados (compatibles):
- `language`, `scenario`, `sector`
- `winery` (legacy)
- `experiences` (legacy)
- `lead` (legacy)
- `messages` (obligatorio)

También soporta internamente:
- `businessContext`, `offers`, `leadContext`, `conversation`, `metadata`

## Contrato response (público)
Siempre retorna top-level compatibles:
- `reply_text`, `language`, `detected_intent`, `people_count`
- `recommended_experience_id`, `alternative_experience_id`
- `objection_detected`, `lead_stage`, `next_step`, `ask_for_contact`
- `conversation_summary`, `lead_name`, `lead_email`, `lead_phone`
- `desired_date`, `fields_to_update`

Puede incluir `_meta` no rompiente.

## Variables de entorno
Obligatorias:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Configurables:
- `PORT`, `NODE_ENV`, `OPENAI_TIMEOUT_MS`
- `ALLOWED_ORIGINS` (CSV)
- `AGENT_SHARED_TOKEN` (si existe, exige `x-agent-token`)
- `DEFAULT_SECTOR`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- `BODY_LIMIT`
- `LOG_LEVEL`, `APP_NAME`

## Seguridad
- `helmet`
- CORS con allowlist por `ALLOWED_ORIGINS`
- limitador de body
- rate limit por IP
- request id (`x-request-id`)
- logs estructurados con redacción parcial de PII

## Desarrollo local
```bash
npm install
npm run dev
```

Tests:
```bash
npm test
```

## Deploy en Render
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/healthz`
- Readiness path recomendado: `/readyz`

## Compatibilidad con DemoEnllacDigital
Se mantiene compatibilidad completa con payload/respuesta legacy del frontend, además de endpoint alias `/chat`.

## Limitaciones actuales
- Rate limiter en memoria (para fase 2 conviene Redis).
- Readiness verifica configuración, no chequea llamada activa al proveedor.
- No persistencia de conversaciones en backend.
