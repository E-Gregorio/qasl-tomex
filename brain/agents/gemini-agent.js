// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — GEMINI AGENT (SUPERFICIE)
// Agente Gemini para analisis profundo de UI y accesibilidad
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import axios from 'axios';

export class GeminiAgent {

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.available = !!this.apiKey;
  }

  async analyzeSurface(surfaceData, snapshot) {
    if (!this.available) {
      console.log('[GEMINI] ⚠ API key no configurada — usando analisis local');
      return null;
    }

    try {
      console.log('[GEMINI] Analizando superficie con IA...');

      const prompt = `Eres Gemini dentro de QASL·TOMEX, el tomografo de testing.
Tu rol es analizar la SUPERFICIE de la aplicacion — lo que el usuario ve.

Datos de la superficie capturada:
Elementos DOM: ${surfaceData.elements || 0}
Formularios: ${surfaceData.forms || 0}
Paginas: ${surfaceData.pages || 0}
Issues locales encontrados: ${JSON.stringify(surfaceData.issues || [])}

Selectores capturados:
${JSON.stringify(snapshot.selectors || {}, null, 2).substring(0, 3000)}

Analiza y responde SOLO con JSON:
{
  "uiIssues": [
    {"description": "...", "selector": "...", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "type": "XSS|ACCESSIBILITY|UX|SECURITY"}
  ],
  "accessibility": {
    "score": 0,
    "issues": [],
    "missingLabels": 0,
    "contrastProblems": 0
  },
  "security": {
    "xssVectors": [],
    "unsanitizedInputs": [],
    "recommendation": ""
  }
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        },
        { timeout: 30000 }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      console.log(`[GEMINI] ✓ Analisis completado: ${result.uiIssues?.length || 0} issues de UI`);
      return result;

    } catch (err) {
      console.log(`[GEMINI] ⚠ Error en analisis: ${err.message}`);
      return null;
    }
  }
}
