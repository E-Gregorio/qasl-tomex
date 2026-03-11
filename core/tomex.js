// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — PUNTO DE ENTRADA PRINCIPAL
// Un solo comando activa todo el tomógrafo
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import 'dotenv/config';
import chalk from 'chalk';
import { TomexOrchestrator } from './orchestrator.js';

// ── PARSER DEL COMANDO DE ACTIVACIÓN ──
function parseCommand(args) {
  // Formato: TOMEX: https://app.com | admin | pass | staging
  // O argumentos directos: node tomex.js https://app.com admin pass staging

  const input = args.join(' ');

  // Detectar formato TOMEX: url | user | pass | env
  const tomexMatch = input.match(/TOMEX:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/i);
  if (tomexMatch) {
    return {
      url: tomexMatch[1].trim(),
      user: tomexMatch[2].trim(),
      pass: tomexMatch[3].trim(),
      env: tomexMatch[4].trim()
    };
  }

  // Formato directo: url user pass env
  if (args.length >= 1) {
    return {
      url: args[0] || process.env.TOMEX_TARGET_URL,
      user: args[1] || process.env.TOMEX_USER,
      pass: args[2] || process.env.TOMEX_PASS,
      env: args[3] || process.env.TOMEX_ENV || 'staging'
    };
  }

  // Usar .env como fallback
  return {
    url: process.env.TOMEX_TARGET_URL,
    user: process.env.TOMEX_USER,
    pass: process.env.TOMEX_PASS,
    env: process.env.TOMEX_ENV || 'staging'
  };
}

// ── VALIDACIÓN ──
function validate(target) {
  if (!target.url) {
    console.error(chalk.red('✗ Error: URL requerida'));
    console.log(chalk.yellow('Uso: node core/tomex.js https://app.com admin pass staging'));
    console.log(chalk.yellow('  o: TOMEX: https://app.com | admin | pass | staging'));
    process.exit(1);
  }
  if (!target.url.startsWith('http')) {
    target.url = 'https://' + target.url;
  }
  return target;
}

// ── MAIN ──
async function main() {
  const args = process.argv.slice(2);

  // Comando especial: help
  if (args[0] === 'help' || args[0] === '--help') {
    showHelp();
    return;
  }

  const target = validate(parseCommand(args));

  const orchestrator = new TomexOrchestrator({
    maxFixAttempts: parseInt(process.env.TOMEX_MAX_FIX_ATTEMPTS) || 3,
    parallelAgents: process.env.TOMEX_PARALLEL_AGENTS !== 'false',
    autoHeal: process.env.TOMEX_AUTO_HEAL !== 'false',
    predict: process.env.TOMEX_PREDICT !== 'false',
    cipherEnabled: process.env.CIPHER_ENABLED !== 'false'
  });

  try {
    const report = await orchestrator.activate(target);
    process.exit(report.score >= 70 ? 0 : 1);
  } catch (error) {
    console.error(chalk.red(`\n✗ TOMEX Error crítico: ${error.message}`));
    process.exit(1);
  }
}

function showHelp() {
  console.log(chalk.cyan(`
⬡ QASL·TOMEX — Quantum Soul Scanner

USO:
  node core/tomex.js [url] [usuario] [password] [ambiente]
  node core/tomex.js "TOMEX: https://app.com | admin | pass | staging"

EJEMPLOS:
  node core/tomex.js https://myapp.com admin secret123 staging
  node core/tomex.js https://myapp.com admin secret123 production

VARIABLES DE ENTORNO (.env):
  TOMEX_TARGET_URL    URL de la aplicación
  TOMEX_USER          Usuario de acceso
  TOMEX_PASS          Password de acceso
  TOMEX_ENV           Ambiente (staging/production/dev)
  ANTHROPIC_API_KEY   API Key de Claude
  OPENAI_API_KEY      API Key de GPT-4
  GOOGLE_API_KEY      API Key de Gemini

"Le ve el alma al código fuente"
  `));
}

main();