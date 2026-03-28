# enllac-agent

Backend HTTP para DemoEnllacAgent, refactorizado para producción con arquitectura modular, validación fuerte, observabilidad y compatibilidad retroactiva.

## Qué hace
- Recibe conversaciones comerciales y contexto de negocio desde frontend.
- Normaliza el payload legado (`winery`, `experiences`, `lead`) a un dominio interno (`businessContext`, `offers`, `leadContext`).
- Construye prompt base + prompt sectorial (winery/generic).
- Consulta LLM y valida salida estructurada.
- Devuelve respuesta pública compatible con el contrato actual de DemoEnllacAgent.

## Endpoints
- `GET /` estado simple.
- `GET /healthz` healthcheck básico.
- `GET /readyz` readiness de configuración mínima.
- `POST /v1/chat` endpoint canónico.
- `POST /chat` alias compatible.
- `POST /` alias temporal compatible.

## Contrato request (compatible)
```json
{
  "language": "es",
  "scenario": "familia",
  "winery": {},
  "experiences": [],
  "lead": {},
  "messages": [{ "role": "user", "content": "..." }]
}
```

## Contrato response (público compatible)
Siempre incluye al menos:
- `reply_text`
- `language`
- `detected_intent`
- `people_count`
- `recommended_experience_id`
- `alternative_experience_id`
- `objection_detected`
- `lead_stage`
- `next_step`
- `ask_for_contact`
- `conversation_summary`
- `lead_name`
- `lead_email`
- `lead_phone`
- `desired_date`
- `fields_to_update`

Además añade `_meta` no rompiente.

## Variables de entorno
- `PORT` (default `3000`)
- `NODE_ENV` (`development|test|production`)
- `OPENAI_API_KEY` (obligatoria en producción)
- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `OPENAI_TIMEOUT_MS` (default `12000`)
- `ALLOWED_ORIGINS` (CSV)
- `AGENT_SHARED_TOKEN` (si existe, requiere `x-agent-token`)
- `LOG_LEVEL` (default `info`)
- `DEFAULT_SECTOR` (default `generic`)
- `RATE_LIMIT_WINDOW_MS` (default `60000`)
- `RATE_LIMIT_MAX` (default `60`)
- `BODY_LIMIT` (default `250kb`)
- `ENABLE_PRETTY_LOGS` (reservado para evolución)
- `APP_NAME` (default `enllac-agent`)

## Local
```bash
npm install
npm run dev
```

## Test
```bash
npm test
```

## Producción / Render
- Usa `npm start` como Start Command.
- Expone `PORT` provisto por Render.
- Configura `OPENAI_API_KEY`, `ALLOWED_ORIGINS`, y opcional `AGENT_SHARED_TOKEN`.
- Usa `GET /healthz` para health check y `GET /readyz` para readiness.

## Seguridad
- CORS con allowlist por ENV.
- Límite de body.
- Rate limit por IP.
- Headers de seguridad básicos.
- Logs estructurados con request id.
- Redacción parcial de PII en logs.
- Errores controlados (`ok:false`, `error.code`, `request_id`).

## Limitaciones actuales
- En este entorno no se pudieron añadir dependencias externas nuevas (p.ej. SDK oficial OpenAI/Zod), por política de acceso al registry.
- Se deja capa `llm.service` desacoplada para migrar fácilmente al SDK oficial cuando esté disponible.
