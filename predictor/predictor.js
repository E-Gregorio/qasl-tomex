// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — PREDICTOR
// Ve el futuro de la aplicación — predice fallos antes de que ocurran
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

export class Predictor {

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async predict(diagnosis, soul) {
    console.log('[PREDICT] Calculando futuro de la aplicación...');

    const response = await this.claude.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Eres QASL·TOMEX Predictor. Basándote en el diagnóstico actual,
predecí qué va a fallar en los próximos 30 días.

Diagnóstico actual:
- Bugs críticos: ${diagnosis.critical?.length || 0}
- Bugs altos: ${diagnosis.high?.length || 0}
- Deuda técnica: ${soul?.technicalDebt || 0} puntos
- Race conditions: ${soul?.raceConditions?.length || 0}
- Bugs latentes: ${JSON.stringify(soul?.latentBugs?.slice(0,5) || [])}

Respondé SOLO en JSON con esta estructura:
{
  "predictions": [
    {
      "timeframe": "7 días | 14 días | 30 días",
      "description": "qué va a fallar exactamente",
      "location": "archivo o módulo",
      "probability": 85,
      "impact": "CRÍTICO | ALTO | MEDIO",
      "preventiveAction": "qué hacer ahora para evitarlo"
    }
  ],
  "overallRisk": "CRÍTICO | ALTO | MEDIO | BAJO",
  "recommendedSprint": "descripción del sprint recomendado para prevenir fallos"
}`
      }]
    });

    try {
      const text = response.content[0].text;
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      result.predictions.forEach(p => {
        console.log(`[PREDICT] 🔮 ${p.timeframe}: ${p.description} (${p.probability}%)`);
      });

      return result.predictions;
    } catch {
      return [{
        timeframe: '30 días',
        description: 'Análisis predictivo no disponible',
        probability: 0,
        impact: 'DESCONOCIDO',
        preventiveAction: 'Revisar manualmente el código fuente'
      }];
    }
  }
}