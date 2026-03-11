// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — REPORTER
// Genera el diagnóstico final — PDF + Slack + Jira
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';

export class Reporter {

  async generate(data) {
    console.log('[REPORT] Generando diagnóstico final...');

    await mkdir('./reports', { recursive: true });

    const report = {
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
      duration: `${Math.round(data.duration / 1000)}s`,
      score: data.score,
      summary: this.buildSummary(data),
      diagnosis: data.diagnosis,
      fixes: data.healed,
      predictions: data.predictions
    };

    // Generar reporte HTML
    const htmlPath = await this.generateHTML(report);
    report.htmlPath = htmlPath;

    // Generar JSON completo
    const jsonPath = `./reports/tomex-${data.sessionId}.json`;
    await writeFile(jsonPath, JSON.stringify(report, null, 2));
    report.jsonPath = jsonPath;

    // Notificar Slack si está configurado
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.notifySlack(report);
    }

    // Crear bugs en Jira si está configurado
    if (process.env.JIRA_URL && data.diagnosis.critical?.length > 0) {
      await this.createJiraBugs(data.diagnosis);
    }

    console.log(`[REPORT] ✓ Reporte generado: ${htmlPath}`);
    console.log(`[REPORT] ✓ Score de salud: ${report.score}/100`);

    return report;
  }

  buildSummary(data) {
    const critical = data.diagnosis.critical?.length || 0;
    const high = data.diagnosis.high?.length || 0;
    const medium = data.diagnosis.medium?.length || 0;
    const low = data.diagnosis.low?.length || 0;
    const fixed = data.healed?.filter(h => h.status === 'FIXED').length || 0;

    return {
      totalIssues: critical + high + medium + low,
      critical, high, medium, low,
      autoFixed: fixed,
      pending: (critical + high) - fixed,
      predictions: data.predictions?.length || 0
    };
  }

  async generateHTML(report) {
    const score = report.score;
    const scoreColor = score >= 80 ? '#00ff94' : score >= 60 ? '#ffc400' : '#ff1744';
    const scoreArc = Math.round(283 * score / 100);
    const fecha = new Date(report.timestamp).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const renderIssues = (items, severity, color, icon) => {
      if (!items || items.length === 0) return '';
      return items.map(b => `
        <tr>
          <td><span class="sev-badge" style="background:${color}15;color:${color};border:1px solid ${color}30">${icon} ${severity}</span></td>
          <td class="issue-desc">${b.description || 'Issue detectado'}</td>
          <td class="issue-loc">${b.location || '—'}</td>
        </tr>`).join('');
    };

    const allIssues = [
      renderIssues(report.diagnosis.critical, 'CRITICAL', '#ff1744', '&#9679;'),
      renderIssues(report.diagnosis.high, 'HIGH', '#ffc400', '&#9679;'),
      renderIssues(report.diagnosis.medium, 'MEDIUM', '#00b8d9', '&#9679;'),
      renderIssues(report.diagnosis.low, 'LOW', '#8892b0', '&#9679;')
    ].join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QASL·TOMEX — Diagnóstico ${report.sessionId}</title>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  :root {
    --void: #0a0e1a;
    --surface: #0f1424;
    --border: rgba(0,229,255,0.1);
    --cyan: #00e5ff;
    --green: #00ff94;
    --red: #ff1744;
    --gold: #ffc400;
    --text: #c8d6e5;
    --dim: #5a6a8a;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: var(--void);
    color: var(--text);
    font-family: 'Rajdhani', 'Segoe UI', sans-serif;
    font-size: 18px;
    line-height: 1.7;
    min-height: 100vh;
  }

  /* ── PAGE CONTAINER ── */
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 56px 80px;
  }

  /* ── HEADER ── */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 40px;
    border-bottom: 2px solid var(--border);
    margin-bottom: 48px;
  }
  .brand {
    font-family: 'Orbitron', monospace;
    font-weight: 900;
    font-size: 2.8rem;
    letter-spacing: 8px;
    color: var(--cyan);
    text-shadow: 0 0 40px rgba(0,229,255,0.4);
  }
  .brand-sub {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.95rem;
    letter-spacing: 5px;
    color: rgba(0,229,255,0.4);
    margin-top: 6px;
  }
  .meta-block {
    text-align: right;
    font-family: 'Share Tech Mono', monospace;
    font-size: 1rem;
    color: var(--dim);
    line-height: 2.2;
  }
  .meta-label { color: rgba(0,229,255,0.5); letter-spacing: 3px; font-size: 0.85rem; }

  /* ── SCORE HERO ── */
  .score-hero {
    display: flex;
    align-items: center;
    gap: 60px;
    padding: 48px 0 52px;
  }
  .score-ring { position: relative; width: 200px; height: 200px; flex-shrink: 0; }
  .score-ring svg { transform: rotate(-90deg); }
  .score-ring .bg { fill: none; stroke: rgba(0,229,255,0.06); stroke-width: 4; }
  .score-ring .fg { fill: none; stroke: ${scoreColor}; stroke-width: 4; stroke-linecap: round; stroke-dasharray: 283; stroke-dashoffset: ${283 - scoreArc}; filter: drop-shadow(0 0 12px ${scoreColor}50); }
  .score-val {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .score-num {
    font-family: 'Orbitron', monospace; font-weight: 900; font-size: 4rem;
    color: ${scoreColor}; text-shadow: 0 0 30px ${scoreColor}40; line-height: 1;
  }
  .score-lbl {
    font-family: 'Share Tech Mono', monospace; font-size: 0.8rem;
    letter-spacing: 4px; color: ${scoreColor}80; margin-top: 8px;
  }
  .score-summary {
    font-family: 'Rajdhani', sans-serif; font-size: 1.4rem;
    color: var(--dim); line-height: 2;
  }
  .score-summary strong { color: var(--text); font-weight: 600; }

  /* ── SECTION ── */
  .section { margin-bottom: 52px; }
  .section-title {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 5px;
    color: var(--cyan);
    padding-bottom: 14px;
    border-bottom: 2px solid var(--border);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .section-title::before {
    content: '';
    width: 4px; height: 20px;
    background: var(--cyan);
    border-radius: 2px;
    box-shadow: 0 0 10px var(--cyan);
  }

  /* ── STATS GRID ── */
  .stats {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    margin-bottom: 48px;
  }
  .stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 28px 16px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .stat::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
  }
  .stat.s-crit::after { background: var(--red); box-shadow: 0 0 10px var(--red); }
  .stat.s-high::after { background: var(--gold); box-shadow: 0 0 10px var(--gold); }
  .stat.s-med::after { background: var(--cyan); }
  .stat.s-low::after { background: var(--dim); }
  .stat.s-fix::after { background: var(--green); box-shadow: 0 0 10px var(--green); }
  .stat.s-pred::after { background: var(--gold); }
  .stat-val {
    font-family: 'Orbitron', monospace;
    font-weight: 900;
    font-size: 2.8rem;
    line-height: 1;
    margin-bottom: 10px;
  }
  .stat.s-crit .stat-val { color: var(--red); }
  .stat.s-high .stat-val { color: var(--gold); }
  .stat.s-med .stat-val { color: var(--cyan); }
  .stat.s-low .stat-val { color: var(--dim); }
  .stat.s-fix .stat-val { color: var(--green); }
  .stat.s-pred .stat-val { color: var(--gold); }
  .stat-lbl {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 3px;
    color: var(--dim);
  }

  /* ── ISSUES TABLE ── */
  .issues-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1.1rem;
  }
  .issues-table th {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    letter-spacing: 3px;
    color: var(--dim);
    text-align: left;
    padding: 14px 16px;
    border-bottom: 2px solid var(--border);
    font-weight: 400;
  }
  .issues-table td {
    padding: 16px 16px;
    border-bottom: 1px solid rgba(0,229,255,0.04);
    vertical-align: top;
  }
  .issues-table tr:hover td { background: rgba(0,229,255,0.02); }
  .sev-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 2px;
    padding: 5px 12px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .issue-desc { color: var(--text); font-weight: 500; font-size: 1.1rem; }
  .issue-loc { font-family: 'Share Tech Mono', monospace; font-size: 0.95rem; color: var(--dim); }
  .no-issues { color: var(--dim); font-style: italic; padding: 20px 0; font-size: 1.1rem; }

  /* ── FIXES ── */
  .fix-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 18px 22px;
    background: rgba(0,255,148,0.03);
    border: 1px solid rgba(0,255,148,0.1);
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 1.1rem;
  }
  .fix-icon { color: var(--green); font-size: 1.4rem; flex-shrink: 0; margin-top: 2px; }
  .fix-desc { color: var(--text); font-weight: 500; font-size: 1.1rem; }
  .fix-meta { font-family: 'Share Tech Mono', monospace; font-size: 0.9rem; color: var(--dim); margin-top: 4px; }

  /* ── PREDICTIONS ── */
  .pred-item {
    display: flex;
    gap: 22px;
    padding: 20px 24px;
    background: var(--surface);
    border: 1px solid rgba(255,196,0,0.1);
    border-left: 4px solid var(--gold);
    border-radius: 0 8px 8px 0;
    margin-bottom: 14px;
  }
  .pred-prob {
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    font-size: 1.3rem;
    color: var(--gold);
    white-space: nowrap;
    min-width: 65px;
  }
  .pred-body { flex: 1; }
  .pred-time { font-family: 'Share Tech Mono', monospace; font-size: 0.9rem; color: var(--gold); letter-spacing: 2px; margin-bottom: 4px; }
  .pred-desc { color: var(--text); font-size: 1.1rem; font-weight: 500; }
  .pred-action { font-size: 1rem; color: var(--dim); margin-top: 6px; }

  /* ── AGENTS ── */
  .agents {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .agent-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 30px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .agent-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
  }
  .agent-card.claude::before { background: var(--cyan); }
  .agent-card.gpt::before { background: var(--green); }
  .agent-card.gemini::before { background: #a855f7; }
  .agent-name {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    letter-spacing: 4px;
    margin-bottom: 8px;
  }
  .agent-card.claude .agent-name { color: var(--cyan); }
  .agent-card.gpt .agent-name { color: var(--green); }
  .agent-card.gemini .agent-name { color: #a855f7; }
  .agent-role {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.9rem;
    color: var(--dim);
    letter-spacing: 2px;
  }
  .agent-status {
    display: inline-block;
    margin-top: 12px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 3px;
    color: var(--green);
    padding: 5px 16px;
    border: 1px solid rgba(0,255,148,0.2);
    border-radius: 3px;
    background: rgba(0,255,148,0.05);
  }

  /* ── FOOTER ── */
  .report-footer {
    margin-top: 64px;
    padding-top: 32px;
    border-top: 2px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-brand {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    letter-spacing: 4px;
    color: rgba(0,229,255,0.3);
  }
  .footer-motto {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    letter-spacing: 3px;
    color: rgba(0,229,255,0.2);
    font-style: italic;
  }

  /* ── PRINT ── */
  @media print {
    body { background: #fff; color: #1a1a2e; }
    .page { padding: 20px; }
    .stat, .agent-card, .pred-item, .fix-item { border-color: #ddd; background: #fafafa; }
    .brand, .section-title { color: #0052cc; text-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <div>
      <div class="brand">QASL·TOMEX</div>
      <div class="brand-sub">QUANTUM SOUL SCANNER — INFORME DE DIAGNOSTICO</div>
    </div>
    <div class="meta-block">
      <div><span class="meta-label">SESSION </span>${report.sessionId}</div>
      <div><span class="meta-label">FECHA </span>${fecha}</div>
      <div><span class="meta-label">DURACION </span>${report.duration}</div>
    </div>
  </div>

  <!-- SCORE HERO -->
  <div class="score-hero">
    <div class="score-ring">
      <svg viewBox="0 0 100 100" width="200" height="200">
        <circle class="bg" cx="50" cy="50" r="45"/>
        <circle class="fg" cx="50" cy="50" r="45"/>
      </svg>
      <div class="score-val">
        <div class="score-num">${score}</div>
        <div class="score-lbl">HEALTH SCORE</div>
      </div>
    </div>
    <div class="score-summary">
      Resultado del escaneo: <strong>${report.summary.totalIssues} issues</strong> detectados en 3 dimensiones.<br>
      De los cuales <strong>${report.summary.critical} criticos</strong> y <strong>${report.summary.high} altos</strong> requieren atencion inmediata.<br>
      TOMEX aplico <strong>${report.summary.autoFixed} auto-fixes</strong> de forma autonoma.<br>
      Quedan <strong>${report.summary.pending} issues pendientes</strong> de resolucion manual.
    </div>
  </div>

  <!-- RESUMEN -->
  <div class="stats">
    <div class="stat s-crit"><div class="stat-val">${report.summary.critical}</div><div class="stat-lbl">CRITICOS</div></div>
    <div class="stat s-high"><div class="stat-val">${report.summary.high}</div><div class="stat-lbl">ALTOS</div></div>
    <div class="stat s-med"><div class="stat-val">${report.summary.medium}</div><div class="stat-lbl">MEDIOS</div></div>
    <div class="stat s-low"><div class="stat-val">${report.summary.low}</div><div class="stat-lbl">BAJOS</div></div>
    <div class="stat s-fix"><div class="stat-val">${report.summary.autoFixed}</div><div class="stat-lbl">AUTO-FIX</div></div>
    <div class="stat s-pred"><div class="stat-val">${report.summary.predictions}</div><div class="stat-lbl">PREDICC.</div></div>
  </div>

  <!-- ISSUES -->
  <div class="section">
    <div class="section-title">HALLAZGOS POR SEVERIDAD</div>
    ${allIssues ? `
    <table class="issues-table">
      <thead><tr><th>SEVERIDAD</th><th>DESCRIPCION</th><th>UBICACION</th></tr></thead>
      <tbody>${allIssues}</tbody>
    </table>` : '<div class="no-issues">Sin issues detectados — aplicacion saludable</div>'}
  </div>

  <!-- AUTO-FIXES -->
  <div class="section">
    <div class="section-title">AUTO-FIXES APLICADOS</div>
    ${(report.fixes || []).filter(f => f.status === 'FIXED').map(f => `
    <div class="fix-item">
      <div class="fix-icon">&#10003;</div>
      <div>
        <div class="fix-desc">${f.bug?.description || 'Fix aplicado'}</div>
        <div class="fix-meta">Corregido en intento ${f.fix?.attempt || 1}</div>
      </div>
    </div>`).join('') || '<div class="no-issues">Sin auto-fixes en esta sesion</div>'}
  </div>

  <!-- PREDICCIONES -->
  <div class="section">
    <div class="section-title">PREDICCIONES — PROXIMOS 30 DIAS</div>
    ${(report.predictions || []).map(p => `
    <div class="pred-item">
      <div class="pred-prob">${p.probability || '?'}%</div>
      <div class="pred-body">
        <div class="pred-time">${p.timeframe || ''}</div>
        <div class="pred-desc">${p.description || ''}</div>
        <div class="pred-action">Accion preventiva: ${p.preventiveAction || 'Consultar reporte completo'}</div>
      </div>
    </div>`).join('') || '<div class="no-issues">Sin predicciones disponibles</div>'}
  </div>

  <!-- AGENTES -->
  <div class="section">
    <div class="section-title">AGENTES PARTICIPANTES</div>
    <div class="agents">
      <div class="agent-card claude">
        <div class="agent-name">CLAUDE</div>
        <div class="agent-role">Director + Alma</div>
        <div class="agent-status">EN LINEA</div>
      </div>
      <div class="agent-card gpt">
        <div class="agent-name">GPT-4</div>
        <div class="agent-role">Venas + APIs</div>
        <div class="agent-status">EN LINEA</div>
      </div>
      <div class="agent-card gemini">
        <div class="agent-name">GEMINI</div>
        <div class="agent-role">Superficie + UI</div>
        <div class="agent-status">EN LINEA</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    <div class="footer-brand">QASL·TOMEX v1.0 | ELYER GREGORIO MALDONADO | BUENOS AIRES 2026</div>
    <div class="footer-motto">"Le ve el alma al codigo fuente"</div>
  </div>

</div>
</body>
</html>`;

    const path = `./reports/tomex-report-${report.sessionId}.html`;
    await writeFile(path, html);
    return path;
  }

  async notifySlack(report) {
    try {
      const emoji = report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '🚨';
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `${emoji} *QASL·TOMEX — Diagnóstico Completo*`,
        attachments: [{
          color: report.score >= 80 ? 'good' : report.score >= 60 ? 'warning' : 'danger',
          fields: [
            { title: 'Health Score', value: `${report.score}/100`, short: true },
            { title: 'Auto-Fixes', value: `${report.summary.autoFixed}`, short: true },
            { title: 'Críticos', value: `${report.summary.critical}`, short: true },
            { title: 'Duración', value: report.duration, short: true }
          ]
        }]
      });
      console.log('[REPORT] ✓ Slack notificado');
    } catch {
      console.log('[REPORT] ⚠ Slack no disponible');
    }
  }

  async createJiraBugs(diagnosis) {
    const bugs = [...(diagnosis.critical || []), ...(diagnosis.high || [])];
    console.log(`[REPORT] Creando ${bugs.length} bugs en Jira...`);
    // Implementar cuando se configure Jira
  }
}