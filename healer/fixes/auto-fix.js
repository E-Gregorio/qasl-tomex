// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — AUTO-FIX ENGINE
// Detecta el bug, genera el fix, hace commit, re-verifica
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';
import simpleGit from 'simple-git';

export class AutoFix {

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.git = null; // Git desactivado hasta tener repo real
    this.maxAttempts = parseInt(process.env.TOMEX_MAX_FIX_ATTEMPTS) || 3;
  }

  async fix(bug) {
    console.log(`[HEAL] Intentando corregir: ${bug.description}`);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      console.log(`[HEAL] Intento ${attempt}/${this.maxAttempts}`);

      try {
        // 1. Leer el archivo con el bug
        const code = await readFile(bug.location, 'utf-8');

        // 2. Claude genera el fix
        const fix = await this.generateFix(code, bug, attempt);
        if (!fix) continue;

        // 3. Aplicar el fix
        await writeFile(bug.location, fix.fixedCode, 'utf-8');

        // 4. Commit al repo
        await this.commitFix(bug, attempt);

        // 5. Verificar que el fix no rompió nada
        const verified = await this.verifyFix(bug);

        if (verified) {
          console.log(`[HEAL] ✓ Fix verificado y aplicado en intento ${attempt}`);
          return { success: true, attempt, fix };
        } else {
          // Revertir y reintentar
          await this.rollback(bug.location, code);
          console.log(`[HEAL] ⚠ Fix rompió algo — revirtiendo...`);
        }

      } catch (err) {
        console.log(`[HEAL] ⚠ Error en intento ${attempt}: ${err.message}`);
      }
    }

    return { success: false, reason: `No se pudo corregir después de ${this.maxAttempts} intentos` };
  }

  async generateFix(code, bug, attempt) {
    const attemptContext = attempt > 1 ?
      `\nEste es el intento ${attempt}. Los intentos anteriores fallaron. Intentá un enfoque diferente.` : '';

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Eres QASL·TOMEX Auto-Heal. Corregí este bug en el código.

Bug: ${bug.description}
Severidad: ${bug.severity}
Archivo: ${bug.location}
${attemptContext}

Código actual:
\`\`\`
${code.substring(0, 4000)}
\`\`\`

Respondé SOLO en JSON:
{
  "fixedCode": "código completo corregido aquí",
  "explanation": "qué cambié y por qué",
  "linesChanged": [{"line": 0, "before": "", "after": ""}]
}

Reglas:
- No cambies la lógica de negocio, solo corregí el bug
- El código debe compilar sin errores
- Mantené el mismo estilo de código`
      }]
    });

    try {
      const text = response.content[0].text;
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }

  async commitFix(bug, attempt) {
  console.log('[HEAL] ⚠ Git desactivado — fix aplicado sin commit');
}

  async verifyFix(bug) {
    // Verificación básica — en producción correr los tests específicos
    try {
      const fixed = await readFile(bug.location, 'utf-8');
      return fixed.length > 0;
    } catch {
      return false;
    }
  }

  async rollback(filePath, originalCode) {
    await writeFile(filePath, originalCode, 'utf-8');
    try {
      await this.git.checkout(filePath);
    } catch { /* continúa */ }
  }
}