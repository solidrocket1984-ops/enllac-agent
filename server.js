const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
Eres un asistente comercial para bodegas del Penedès.
Tu objetivo es recomendar experiencias, resolver dudas y ayudar a captar leads.

Normas:
- Responde en catalán, castellano o inglés según el idioma recibido.
- Sé claro, elegante y comercial.
- No inventes información.
- Devuelve SIEMPRE un JSON con esta estructura:

{
  "reply_text": "texto de respuesta",
  "language": "ca",
  "detected_intent": "pareja",
  "people_count": 2,
  "recommended_experience_id": "exp_1",
  "alternative_experience_id": null,
  "objection_detected": "none",
  "lead_stage": "qualified",
  "next_step": "ask_contact",
  "ask_for_contact": true,
  "conversation_summary": "resumen breve",
  "fields_to_update": {}
}
`;

app.get("/", function (req, res) {
  res.send("Agente Enllaç funcionando");
});

app.post("/chat", function (req, res) {
  const payload = req.body;

  const requestBody = JSON.stringify({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify(payload)
      }
    ]
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
  parsed.output &&
  parsed.output[0] &&
  parsed.output[0].content &&
  parsed.output[0].content[0] &&
  parsed.output[0].content[0].text;

if (!outputText) {
  return res.status(500).json({
    ok: false,
    error: "No se encontró texto en la respuesta de OpenAI",
    raw: parsed
  });
}

const finalJson = JSON.parse(outputText);

res.json(finalJson);
      } catch (err) {
        console.error("Error parseando respuesta:", err);
        res.status(500).json({
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