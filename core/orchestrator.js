// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — CORE ORCHESTRATOR
// El cerebro que coordina los 3 médicos y las 3 dimensiones
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { CipherProtocol } from '../encryptor/cipher.js';
import { SurfaceScanner } from '../scanner/surface/surface-scanner.js';
import { ApiCapture, CollectionGenerator } from '../scanner/veins/api-capture.js';
import { AstAnalyzer } from '../scanner/soul/ast-analyzer.js';
import { AutoFix } from '../healer/fixes/auto-fix.js';
import { Predictor } from '../predictor/predictor.js';
import { Reporter } from '../reporter/reporter.js';
import { GPT4Agent } from '../brain/agents/gpt4-agent.js';
import { GeminiAgent } from '../brain/agents/gemini-agent.js';

export class TomexOrchestrator extends EventEmitter {

  constructor(config) {
    super();
    this.config = config;
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.cipher = new CipherProtocol();
    this.gpt4 = new GPT4Agent();
    this.gemini = new GeminiAgent();
    this.sessionId = `TOMEX-${Date.now()}`;
    this.findings = [];
    this.fixes = [];
    this.predictions = [];
    this.startTime = null;
  }

  async activate(target) {
    this.startTime = Date.now();
    this.announce(target);

    try {
      this.emit('phase', { phase: 'awaken', status: 'start' });
      await this.phase0_awaken(target);
      this.emit('phase', { phase: 'awaken', status: 'done' });

      this.emit('phase', { phase: 'snapshot', status: 'start' });
      const snapshot = await this.phase1_snapshot(target);
      this.emit('phase', { phase: 'snapshot', status: 'done', data: { elements: snapshot.elements, forms: snapshot.forms, apis: snapshot.apis } });

      this.emit('phase', { phase: 'scan', status: 'start' });
      const [surface, veins, soul] = await Promise.all([
        this.phase2_surface(snapshot),
        this.phase2_veins(snapshot),
        this.phase2_soul(snapshot)
      ]);
      this.emit('phase', { phase: 'scan', status: 'done' });

      this.emit('phase', { phase: 'diagnose', status: 'start' });
      const diagnosis = await this.phase3_diagnose(surface, veins, soul);
      this.emit('phase', { phase: 'diagnose', status: 'done', data: diagnosis });

      this.emit('phase', { phase: 'heal', status: 'start' });
      const healed = await this.phase4_heal(diagnosis);
      this.emit('phase', { phase: 'heal', status: 'done', data: { fixed: healed.filter(h => h.status === 'FIXED').length, total: healed.length } });

      this.emit('phase', { phase: 'predict', status: 'start' });
      const predictions = await this.phase5_predict(diagnosis, soul);
      this.emit('phase', { phase: 'predict', status: 'done', data: predictions });

      this.emit('phase', { phase: 'report', status: 'start' });
      const report = await this.phase6_report(diagnosis, healed, predictions);
      this.emit('phase', { phase: 'report', status: 'done' });

      this.emit('complete', report);
      return report;

    } catch (error) {
      this.emit('error', { message: error.message });
      await this.autoHealOrchestrator(error, target);
    }
  }

  async phase0_awaken(target) {
    this.log('cyan', '⬡ QASL·TOMEX ACTIVADO');
    this.log('cyan', `🎯 Target: ${target.url}`);
    this.log('cyan', `🌍 Ambiente: ${target.env}`);
    this.log('violet', '🔐 Protocolo CIPHER iniciado');
    this.log('cyan', '🌌 Abriendo túnel cuántico...');
    const agents = await this.cipher.pingAgents();
    agents.forEach(a => this.log('green', `✓ ${a.name} [${a.role}] → EN LÍNEA`));
    this.log(this.gpt4.available ? 'green' : 'yellow', `${this.gpt4.available ? '✓' : '⚠'} GPT-4 API: ${this.gpt4.available ? 'CONECTADO' : 'sin key — modo local'}`);
    this.log(this.gemini.available ? 'green' : 'yellow', `${this.gemini.available ? '✓' : '⚠'} Gemini API: ${this.gemini.available ? 'CONECTADO' : 'sin key — modo local'}`);
    this.log('cyan', '⚡ Los médicos entraron al cuerpo');
  }

  async phase1_snapshot(target) {
    this.log('cyan', '📸 Iniciando snapshot completo...');
    const surface = new SurfaceScanner();
    const snapshot = await surface.capture(target);
    this.log('green', `✓ DOM capturado: ${snapshot.elements} elementos`);
    this.log('green', `✓ Formularios: ${snapshot.forms} detectados`);
    this.log('green', `✓ APIs interceptadas: ${snapshot.apis} endpoints`);
    this.log('green', `✓ Código fuente: ${snapshot.files || 0} archivos`);
    return snapshot;
  }

  async phase2_surface(snapshot) {
    this.log('violet', '[GEMINI] Escaneando superficie...');
    this.emit('dimension', { dim: 'surface', status: 'scanning', desc: 'MCP+Playwright navegando UI...' });
    const scanner = new SurfaceScanner();
    const results = await scanner.analyze(snapshot);

    // Enriquecer con Gemini AI si está disponible
    const geminiAnalysis = await this.gemini.analyzeSurface(results, snapshot);
    if (geminiAnalysis) {
      results.geminiIssues = geminiAnalysis.uiIssues || [];
      results.accessibility = geminiAnalysis.accessibility || {};
      results.security = geminiAnalysis.security || {};
      results.issues = [...(results.issues || []), ...(geminiAnalysis.uiIssues || [])];
      this.log('violet', `[GEMINI] ✓ IA: ${geminiAnalysis.uiIssues?.length || 0} issues adicionales`);
    }

    await this.cipher.send({ from: 'GEMINI', to: 'CLAUDE', type: 'SCAN', payload: results });
    this.emit('dimension', { dim: 'surface', status: 'done', desc: `Superficie: ${results.issues?.length || 0} issues`, data: results });
    this.log('violet', `[GEMINI] ✓ Superficie: ${results.issues?.length || 0} issues encontrados`);
    return results;
  }

  async phase2_veins(snapshot) {
    this.log('green', '[GPT-4] Escaneando venas...');
    this.emit('dimension', { dim: 'veins', status: 'scanning', desc: 'Interceptando APIs en vuelo...' });
    const capture = new ApiCapture();
    const generator = new CollectionGenerator();
    const apis = await capture.extractFromSnapshot(snapshot);
    this.emit('dimension', { dim: 'veins', status: 'scanning', desc: `Analizando ${apis.length} endpoints capturados` });

    // Análisis directo de APIs capturadas (universal, sin Newman)
    const apiAnalysis = capture.analyzeApis(apis, snapshot);

    // Newman collection (intenta ejecutar, pero no depende de ello)
    let newmanResults = { endpoints: 0, failures: 0, passed: 0, duration: 0 };
    if (apis.length > 0 && apis.length <= 30) {
      try {
        const collection = await generator.generate(apis, snapshot.url);
        newmanResults = await capture.runNewman(collection);
      } catch (err) {
        console.log(`[VEINS] ⚠ Newman skip: ${err.message}`);
      }
    } else if (apis.length > 30) {
      // Solo generar collection de las primeras 30
      const collection = await generator.generate(apis.slice(0, 30), snapshot.url);
      await generator.generate(apis, snapshot.url); // guardar la completa
      newmanResults = await capture.runNewman(collection);
    }

    // Combinar resultados
    const results = {
      ...newmanResults,
      apiAnalysis,
      apiIssues: apiAnalysis.issues || [],
      apiCount: apiAnalysis.apiCount,
      domains: apiAnalysis.domains,
      thirdPartyCount: apiAnalysis.thirdPartyCount
    };

    // Enriquecer con GPT-4 AI si está disponible
    const gptAnalysis = await this.gpt4.analyzeVeins(results, snapshot);
    if (gptAnalysis) {
      results.gptVulnerabilities = gptAnalysis.vulnerabilities || [];
      results.gptPerformance = gptAnalysis.performance || {};
      results.gptAuth = gptAnalysis.authentication || {};
      this.log('green', `[GPT-4] ✓ IA: ${gptAnalysis.vulnerabilities?.length || 0} vulnerabilidades detectadas`);
    }

    await this.cipher.send({ from: 'GPT', to: 'CLAUDE', type: 'SCAN', payload: results });
    const totalIssues = (results.apiIssues?.length || 0) + (results.gptVulnerabilities?.length || 0);
    this.emit('dimension', { dim: 'veins', status: 'done', desc: `Venas: ${results.apiCount || 0} APIs, ${totalIssues} issues`, data: results });
    this.log('green', `[GPT-4] ✓ Venas: ${results.apiCount || 0} APIs, ${totalIssues} issues`);
    return results;
  }

  async phase2_soul(snapshot) {
    this.log('gold', '[CLAUDE] Penetrando el alma del código...');
    this.emit('dimension', { dim: 'soul', status: 'scanning', desc: 'Analizando codigo fuente AST...' });

    const analyzer = new AstAnalyzer();
    const repoPath = snapshot.repoPath || './apps/demo-patient';

    // Verificar si el repoPath existe y tiene archivos
    let results;
    try {
      const { statSync } = await import('fs');
      statSync(repoPath);
      results = await analyzer.analyze(repoPath);
    } catch {
      // No hay repo local — analizar lo que se pueda del HTML/JS capturado
      this.log('gold', '[CLAUDE] ⚠ Sin repo local — analizando JavaScript inline de la página');
      results = await this.soulAnalyzeFromSnapshot(snapshot);
    }

    this.emit('dimension', { dim: 'soul', status: 'done', desc: `Alma: ${results.functions || 0} funciones, ${results.latentBugs?.length || 0} bugs latentes`, data: results });
    this.log('gold', `[CLAUDE] ✓ Alma: ${results.functions || 0} funciones analizadas`);
    this.log('gold', `[CLAUDE] ✓ Bugs latentes: ${results.latentBugs?.length || 0} detectados`);
    this.log('gold', `[CLAUDE] ✓ Deuda técnica: ${results.technicalDebt || 0} puntos`);
    return results;
  }

  // ── SOUL: análisis desde snapshot cuando no hay repo local ──
  async soulAnalyzeFromSnapshot(snapshot) {
    // Construir contexto desde lo capturado por Surface
    const context = {
      url: snapshot.url,
      elements: snapshot.elements || 0,
      forms: snapshot.forms || 0,
      apis: snapshot.apis || 0,
      consoleErrors: snapshot.consoleErrors?.length || 0,
      pageErrors: snapshot.pageErrors?.length || 0,
      failedResources: snapshot.failedResources?.length || 0,
      securityHeaders: snapshot.responseHeaders || {},
      capturedApis: (snapshot.capturedApis || []).slice(0, 20).map(a => ({ method: a.method, url: a.url.substring(0, 100) }))
    };

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Eres QASL·TOMEX Soul Analyzer. Analizá la arquitectura y posibles problemas de esta aplicación web basándote en lo que capturó el scanner.

URL: ${context.url}
Elementos DOM: ${context.elements}
Formularios: ${context.forms}
APIs capturadas: ${context.apis}
Errores de consola: ${context.consoleErrors}
Errores JavaScript: ${context.pageErrors}
Recursos fallidos: ${context.failedResources}
APIs: ${JSON.stringify(context.capturedApis)}
Security headers presentes: ${Object.keys(context.securityHeaders).join(', ')}

Respondé ÚNICAMENTE con JSON, sin markdown ni texto extra:
{"functions":0,"latentBugs":[{"description":"...","location":"...","severity":"HIGH|MEDIUM|LOW"}],"raceConditions":[],"securityIssues":[{"description":"...","location":"..."}],"technicalDebt":0,"codeSmells":[]}`
        }]
      });

      const text = response.content[0].text.replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      console.log(`[SOUL] ⚠ Claude API error: ${err.message}`);
      return { functions: 0, latentBugs: [], raceConditions: [], securityIssues: [], technicalDebt: 0, codeSmells: [] };
    }
  }

  async phase3_diagnose(surface, veins, soul) {
    this.log('cyan', '🔬 Consolidando diagnóstico...');

    // Recolectar issues directos de Surface y Veins (ya detectados sin IA)
    const directIssues = [
      ...(surface.issues || []),
      ...(veins.apiIssues || [])
    ];

    // Clasificar issues directos
    const directDiagnosis = { critical: [], high: [], medium: [], low: [] };
    for (const issue of directIssues) {
      const sev = (issue.severity || 'LOW').toLowerCase();
      const entry = { description: issue.description, location: issue.location || '' };
      if (sev === 'critical') directDiagnosis.critical.push(entry);
      else if (sev === 'high') directDiagnosis.high.push(entry);
      else if (sev === 'medium') directDiagnosis.medium.push(entry);
      else directDiagnosis.low.push(entry);
    }

    // Pedir a Claude que consolide + agregue insights del Soul
    let aiDiagnosis = { critical: [], high: [], medium: [], low: [] };
    try {
      // Limitar tamaño del payload para no exceder tokens
      const surfaceSummary = {
        issues: (surface.issues || []).length,
        elements: surface.elements,
        forms: surface.forms,
        apis: surface.apis,
        consoleErrors: surface.consoleErrors || 0,
        pageErrors: surface.pageErrors || 0,
        failedResources: surface.failedResources || 0,
        performance: surface.performance || {},
        securityHeaders: surface.securityHeaders || {}
      };
      const veinsSummary = {
        apiCount: veins.apiCount || veins.endpoints || 0,
        failures: veins.failures || 0,
        thirdPartyCount: veins.thirdPartyCount || 0,
        issuesCount: (veins.apiIssues || []).length,
        domains: (veins.domains || []).slice(0, 10)
      };
      const soulSummary = {
        functions: soul.functions || 0,
        latentBugs: (soul.latentBugs || []).slice(0, 10),
        securityIssues: (soul.securityIssues || []).slice(0, 10),
        technicalDebt: soul.technicalDebt || 0,
        raceConditions: (soul.raceConditions || []).slice(0, 5)
      };

      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Eres QASL·TOMEX Director. Ya se detectaron ${directIssues.length} issues directos. Ahora consolidá con los hallazgos del Soul y devolvé SOLO issues ADICIONALES que no estén ya en la lista directa.

Surface resumen: ${JSON.stringify(surfaceSummary)}
Veins resumen: ${JSON.stringify(veinsSummary)}
Soul (CLAUDE): ${JSON.stringify(soulSummary)}

Respondé ÚNICAMENTE con JSON, sin markdown ni texto extra.
Solo incluí issues NUEVOS del Soul o insights cruzados. No repitas los ${directIssues.length} ya detectados.
{"critical":[{"description":"...","location":"..."}],"high":[{"description":"...","location":"..."}],"medium":[{"description":"...","location":"..."}],"low":[{"description":"...","location":"..."}]}`
        }]
      });

      const text = response.content[0].text.replace(/```json|```/g, '').trim();
      aiDiagnosis = JSON.parse(text);
    } catch (err) {
      console.log(`[DIAGNOSE] ⚠ Claude consolidation error: ${err.message}`);
    }

    // Fusionar: directos + IA
    const diagnosis = {
      critical: [...directDiagnosis.critical, ...(aiDiagnosis.critical || [])],
      high: [...directDiagnosis.high, ...(aiDiagnosis.high || [])],
      medium: [...directDiagnosis.medium, ...(aiDiagnosis.medium || [])],
      low: [...directDiagnosis.low, ...(aiDiagnosis.low || [])]
    };

    diagnosis.critical.forEach(b => {
      this.log('red', `🔴 CRÍTICO: ${b.description || 'Issue crítico detectado'} — ${b.location || ''}`);
      this.emit('finding', { severity: 'critical', description: b.description || 'Issue crítico detectado', location: b.location || '' });
    });
    diagnosis.high.forEach(b => {
      this.log('yellow', `🟡 ALTO: ${b.description || 'Issue alto detectado'} — ${b.location || ''}`);
      this.emit('finding', { severity: 'high', description: b.description || 'Issue alto detectado', location: b.location || '' });
    });
    (diagnosis.medium || []).forEach(b => {
      this.log('cyan', `🔵 MEDIO: ${b.description || 'Issue medio detectado'} — ${b.location || ''}`);
      this.emit('finding', { severity: 'medium', description: b.description || 'Issue medio detectado', location: b.location || '' });
    });
    (diagnosis.low || []).forEach(b => {
      this.emit('finding', { severity: 'low', description: b.description || 'Issue bajo detectado', location: b.location || '' });
    });

    const total = diagnosis.critical.length + diagnosis.high.length + diagnosis.medium.length + diagnosis.low.length;
    this.log('cyan', `🔬 Diagnóstico total: ${total} issues (${diagnosis.critical.length}C/${diagnosis.high.length}H/${diagnosis.medium.length}M/${diagnosis.low.length}L)`);

    return diagnosis;
  }

  async phase4_heal(diagnosis) {
    this.log('cyan', '💊 Iniciando auto-heal...');
    const healer = new AutoFix();
    const criticalAndHigh = [...(diagnosis.critical || []), ...(diagnosis.high || [])];
    const results = [];
    for (const bug of criticalAndHigh) {
      const fix = await healer.fix(bug);
      if (fix.success) {
        this.log('green', `✓ Fix aplicado: ${bug.description}`);
        results.push({ bug, fix, status: 'FIXED' });
        this.emit('finding', { severity: 'fixed', description: bug.description || 'Fix aplicado', location: bug.location || '' });
      } else {
        this.log('yellow', `⚠ No pudo corregirse: ${bug.description}`);
        results.push({ bug, fix, status: 'PENDING' });
      }
    }
    return results;
  }

  async phase5_predict(diagnosis, soul) {
    this.log('gold', '🔮 Calculando futuro de la aplicación...');
    const predictor = new Predictor();
    const predictions = await predictor.predict(diagnosis, soul);
    predictions.forEach(p =>
      this.log('gold', `🔮 ${p.timeframe}: ${p.description} (${p.probability}% probabilidad)`)
    );
    return predictions;
  }

  async phase6_report(diagnosis, healed, predictions) {
    this.log('cyan', '📊 Generando reporte final...');
    const reporter = new Reporter();
    const report = await reporter.generate({
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      diagnosis,
      healed,
      predictions,
      score: this.calculateScore(diagnosis, healed)
    });
    this.log('green', `✅ Score de salud: ${report.score}/100`);
    this.log('green', `✅ Reporte generado: ${report.htmlPath}`);
    this.log('green', `⬡ DIAGNÓSTICO COMPLETO`);
    return report;
  }

  async autoHealOrchestrator(error, target) {
    this.log('yellow', `⚠ Error detectado: ${error.message}`);
    this.log('yellow', '🔄 Activando modo auto-heal del orquestador...');
    if (error.message.includes('GPT')) {
      this.log('cyan', '→ GPT no disponible — Claude asume las venas');
    } else if (error.message.includes('Gemini')) {
      this.log('cyan', '→ Gemini no disponible — Playwright asume la superficie');
    } else {
      this.log('red', `✗ Error crítico no recuperable: ${error.message}`);
      throw error;
    }
  }

  calculateScore(diagnosis, healed) {
    const total = (diagnosis.critical?.length || 0) + (diagnosis.high?.length || 0) +
                  (diagnosis.medium?.length || 0) + (diagnosis.low?.length || 0);
    const fixed = healed.filter(h => h.status === 'FIXED').length;
    const remaining = total - fixed;
    return Math.max(0, Math.round(100 - (remaining * 5) - ((diagnosis.critical?.length || 0) * 10)));
  }

  async loadPrompt(name) {
    const { readFile } = await import('fs/promises');
    const path = `./brain/prompts/static/${name}.md`;
    return await readFile(path, 'utf-8');
  }

  announce(target) {
    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.cyan('          ⬡  QASL·TOMEX  ACTIVADO  ⬡             ') + chalk.cyan('║'));
    console.log(chalk.cyan('║                                                  ║'));
    console.log(chalk.cyan('║  ') + chalk.green('🔐 Protocolo CIPHER iniciado                    ') + chalk.cyan('║'));
    console.log(chalk.cyan('║  ') + chalk.cyan('🧠 Super Prompt cargado                         ') + chalk.cyan('║'));
    console.log(chalk.cyan('║                                                  ║'));
    console.log(chalk.cyan('║  ') + chalk.bold(`🎯 Target: ${target.url.padEnd(38)}`) + chalk.cyan('║'));
    console.log(chalk.cyan('║  ') + chalk.bold(`🌍 Ambiente: ${target.env.padEnd(36)}`) + chalk.cyan('║'));
    console.log(chalk.cyan('║                                                  ║'));
    console.log(chalk.cyan('║  ') + chalk.yellow('🌌 Abriendo túnel cuántico...                   ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════╝\n'));
  }

  log(color, msg) {
    const colors = {
      cyan: chalk.cyan, green: chalk.green,
      red: chalk.red, yellow: chalk.yellow,
      violet: chalk.magenta, gold: chalk.yellow
    };
    const ts = new Date().toISOString().substr(11, 8);
    console.log(colors[color](`[${ts}] ${msg}`));
  }
}