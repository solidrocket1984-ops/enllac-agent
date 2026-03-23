const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
Eres un asistente comercial para bodegas del Penedès.

Objetivo:
- recomendar experiencias
- resolver dudas
- captar leads

Normas:
- responde en catalán, castellano, inglés, francés o ruso según el idioma del usuario
- sé claro, elegante y comercial
- no inventes información
- usa solo la información recibida en winery, experiences y messages
- reply_text debe ser breve, útil y natural
- si el usuario comparte nombre, email, teléfono o fecha deseada, extráelos
- si no conoces un dato, devuelve null
`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply_text: { type: "string" },
    language: { type: ["string", "null"] },
    detected_intent: { type: ["string", "null"] },
    people_count: { type: ["integer", "null"] },
    recommended_experience_id: { type: ["string", "null"] },
    alternative_experience_id: { type: ["string", "null"] },
    objection_detected: { type: ["string", "null"] },
    lead_stage: { type: ["string", "null"] },
    next_step: { type: ["string", "null"] },
    ask_for_contact: { type: "boolean" },
    conversation_summary: { type: ["string", "null"] },
    lead_name: { type: ["string", "null"] },
    lead_email: { type: ["string", "null"] },
    lead_phone: { type: ["string", "null"] },
    desired_date: { type: ["string", "null"] },
    fields_to_update: {
      type: "object",
      additionalProperties: true
    }
  },
  required: [
    "reply_text",
    "language",
    "detected_intent",
    "people_count",
    "recommended_experience_id",
    "alternative_experience_id",
    "objection_detected",
    "lead_stage",
    "next_step",
    "ask_for_contact",
    "conversation_summary",
    "lead_name",
    "lead_email",
    "lead_phone",
    "desired_date",
    "fields_to_update"
  ]
};

app.get("/", function (req, res) {
  res.send("Agente Enllaç funcionando");
});

app.post("/chat", function (req, res) {
  const payload = req.body;

  const requestBody = JSON.stringify({
    model: "gpt-4.1-mini",
    instructions: SYSTEM_PROMPT,
    max_output_tokens: 220,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "lead_response",
        strict: true,
        schema: RESPONSE_SCHEMA
      }
    },
    input: JSON.stringify(payload)
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/responses",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
      "Content-Length": Buffer.byteLength(requestBody)
    }
  };

  const apiReq = https.request(options, function (apiRes) {
    let data = "";

    apiRes.on("data", function (chunk) {
      data += chunk;
    });

    apiRes.on("end", function () {
      try {
        const parsed = JSON.parse(data);

        const outputText =
          parsed.output_text ||
          (parsed.output &&
            parsed.output[0] &&
            parsed.output[0].content &&
            parsed.output[0].content[0] &&
            parsed.output[0].content[0].text);

        if (!outputText) {
          return res.status(500).json({
            ok: false,
            error: "No se encontró texto en la respuesta de OpenAI",
            raw: parsed
          });
        }

        const finalJson = JSON.parse(outputText);
        return res.json(finalJson);
      } catch (err) {
        console.error("Error parseando respuesta:", err);
        return res.status(500).json({
          ok: false,
          error: "No se pudo parsear la respuesta de OpenAI",
          raw: data
        });
      }
    });
  });

  apiReq.on("error", function (error) {
    console.error("Error en request HTTPS:", error);
    res.status(500).json({
      ok: false,
      error: "Error llamando a OpenAI"
    });
  });

  apiReq.write(requestBody);
  apiReq.end();
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Servidor funcionando en http://localhost:3000");
});
