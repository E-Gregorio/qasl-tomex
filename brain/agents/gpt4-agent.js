// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — GPT-4 AGENT (VENAS)
// Agente GPT-4 para analisis profundo de APIs y endpoints
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import axios from 'axios';

export class GPT4Agent {

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.available = !!this.apiKey;
  }

  async analyzeVeins(veinsData, snapshot) {
    if (!this.available) {
      console.log('[GPT-4] ⚠ API key no configurada — usando analisis local');
      return null;
    }

    try {
      console.log('[GPT-4] Analizando venas con IA...');

      const prompt = `Eres GPT-4 dentro de QASL·TOMEX, el tomografo de testing.
Tu rol es analizar las VENAS de la aplicacion — el flujo de datos a traves de APIs.

Datos de APIs capturadas:
${JSON.stringify(veinsData, null, 2)}

URL base: ${snapshot.url || 'desconocida'}
APIs interceptadas: ${snapshot.apis || 0}

Analiza y responde SOLO con JSON:
{
  "vulnerabilities": [
    {"description": "...", "endpoint": "...", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "type": "AUTH|INJECTION|DATA_LEAK|PERFORMANCE"}
  ],
  "performance": {
    "slowEndpoints": [],
    "avgResponseTime": 0,
    "recommendation": ""
  },
  "authentication": {
    "issues": [],
    "tokenSecurity": "SECURE|WEAK|CRITICAL"
  }
}`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const text = response.data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      console.log(`[GPT-4] ✓ Analisis completado: ${result.vulnerabilities?.length || 0} vulnerabilidades`);
      return result;

    } catch (err) {
      console.log(`[GPT-4] ⚠ Error en analisis: ${err.message}`);
      return null;
    }
  }
}
