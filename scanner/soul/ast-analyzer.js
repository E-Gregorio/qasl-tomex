// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — AST ANALYZER (ALMA DEL CÓDIGO)
// Se mete dentro del código fuente y ve todo por dentro
// Dimensión 3 — El Alma
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import * as acorn from 'acorn';
import Anthropic from '@anthropic-ai/sdk';

export class AstAnalyzer {

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs'];
    this.findings = [];
  }

  // ── ANÁLISIS COMPLETO DEL REPOSITORIO ──
  async analyze(repoPath) {
    console.log(`[SOUL] Penetrando código fuente: ${repoPath}`);

    const files = await this.collectFiles(repoPath);
    console.log(`[SOUL] ${files.length} archivos encontrados`);

    const results = {
      files: files.length,
      functions: 0,
      latentBugs: [],
      technicalDebt: 0,
      raceConditions: [],
      securityIssues: [],
      badPatterns: [],
      complexity: {}
    };

    // Analizar cada archivo
    for (const file of files) {
      const fileResult = await this.analyzeFile(file);
      results.functions += fileResult.functions;
      results.latentBugs.push(...fileResult.latentBugs);
      results.raceConditions.push(...fileResult.raceConditions);
      results.securityIssues.push(...fileResult.securityIssues);
      results.badPatterns.push(...fileResult.badPatterns);
      results.technicalDebt += fileResult.debt;
    }

    // Claude analiza patrones globales
    results.globalAnalysis = await this.globalAnalysis(results);

    return results;
  }

  // ── ANÁLISIS DE UN ARCHIVO ──
  async analyzeFile(filePath) {
    const result = {
      file: filePath,
      functions: 0,
      latentBugs: [],
      raceConditions: [],
      securityIssues: [],
      badPatterns: [],
      debt: 0
    };

    try {
      const code = await readFile(filePath, 'utf-8');

      // 1. Análisis AST estático
      const astResult = this.parseAST(code, filePath);
      result.functions = astResult.functions;
      result.badPatterns = astResult.badPatterns;

      // 2. Claude analiza la lógica con IA
      const aiResult = await this.claudeAnalyzeCode(code, filePath);
      result.latentBugs = aiResult.latentBugs;
      result.raceConditions = aiResult.raceConditions;
      result.securityIssues = aiResult.securityIssues;
      result.debt = aiResult.debtScore;

    } catch (err) {
      console.log(`[SOUL] ⚠ Error analizando ${filePath}: ${err.message}`);
    }

    return result;
  }

  // ── PARSER AST ──
  parseAST(code, filePath) {
    const result = { functions: 0, badPatterns: [] };

    try {
      const ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowImportExportEverywhere: true
      });

      this.walkAST(ast, (node) => {
        // Contar funciones
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') {
          result.functions++;
        }

        // Detectar catch vacíos
        if (node.type === 'CatchClause' &&
            node.body.body.length === 0) {
          result.badPatterns.push({
            type: 'EMPTY_CATCH',
            file: filePath,
            line: node.loc?.start?.line,
            description: 'Catch vacío — error silenciado sin manejo'
          });
        }

        // Detectar eval() — security risk
        if (node.type === 'CallExpression' &&
            node.callee.name === 'eval') {
          result.badPatterns.push({
            type: 'EVAL_USAGE',
            severity: 'CRITICAL',
            file: filePath,
            line: node.loc?.start?.line,
            description: 'Uso de eval() — vulnerabilidad de seguridad crítica'
          });
        }

        // Detectar console.log en producción
        if (node.type === 'CallExpression' &&
            node.callee?.object?.name === 'console') {
          result.badPatterns.push({
            type: 'CONSOLE_LOG',
            severity: 'LOW',
            file: filePath,
            line: node.loc?.start?.line,
            description: 'console.log detectado — puede exponer datos en producción'
          });
        }
      });

    } catch (parseError) {
      // No es JS parseable — ignorar
    }

    return result;
  }

  // ── CLAUDE ANALIZA EL CÓDIGO CON IA ──
  async claudeAnalyzeCode(code, filePath) {
    // Solo saltar archivos muy cortos (< 10 líneas)
    const lines = code.split('\n').length;
    if (lines < 10) {
      console.log(`[SOUL] ⏭ ${filePath} — ${lines} líneas, saltando (muy corto)`);
      return { latentBugs: [], raceConditions: [], securityIssues: [], debtScore: 0 };
    }
    console.log(`[SOUL] 🔬 Claude analizando: ${filePath} (${lines} líneas)`);

    try {
      const response = await this.claude.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Eres QASL·TOMEX, el tomógrafo de código.
Analiza este archivo como un radiólogo — buscá bugs latentes, 
race conditions, problemas de seguridad y código mal escrito.

Archivo: ${filePath}
\`\`\`
${code.substring(0, 3000)}
\`\`\`

Respondé SOLO en JSON con esta estructura exacta:
{
  "latentBugs": [{"description":"","location":"","severity":"CRITICAL|HIGH|MEDIUM|LOW"}],
  "raceConditions": [{"description":"","location":"","probability":"HIGH|MEDIUM|LOW"}],
  "securityIssues": [{"description":"","location":"","cve":""}],
  "debtScore": 0
}
Si no hay problemas, devolvé arrays vacíos.`
        }]
      });

      const text = response.content[0].text;
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);

    } catch (err) {
      console.log(`[SOUL] ⚠ Claude API error en ${filePath}: ${err.message}`);
      return { latentBugs: [], raceConditions: [], securityIssues: [], debtScore: 0 };
    }
  }

  // ── ANÁLISIS GLOBAL ──
  async globalAnalysis(results) {
    if (results.latentBugs.length === 0) {
      console.log('[SOUL] No se detectaron bugs latentes — saltando análisis global');
      return null;
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Eres QASL·TOMEX. Dado este diagnóstico del código fuente:
${JSON.stringify(results.latentBugs.slice(0, 10))}

¿Cuál es el patrón principal de problemas? 
¿Qué módulo tiene mayor riesgo? 
¿Qué debería corregirse primero?

Respondé en máximo 3 líneas, directo y preciso.`
        }]
      });

      return response.content[0].text;
    } catch (err) {
      console.log(`[SOUL] ⚠ Error en análisis global: ${err.message}`);
      return null;
    }
  }

  // ── WALKER AST ──
  walkAST(node, visitor) {
    if (!node || typeof node !== 'object') return;
    visitor(node);
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => this.walkAST(c, visitor));
      } else if (child && typeof child === 'object' && child.type) {
        this.walkAST(child, visitor);
      }
    }
  }

  // ── RECOLECTOR DE ARCHIVOS ──
  async collectFiles(dirPath, files = []) {
    try {
      const entries = await readdir(dirPath);
      for (const entry of entries) {
        // Ignorar node_modules, .git, dist
        if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry)) continue;

        const fullPath = join(dirPath, entry);
        const info = await stat(fullPath);

        if (info.isDirectory()) {
          await this.collectFiles(fullPath, files);
        } else if (this.supportedExtensions.includes(extname(entry))) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      console.log(`[SOUL] ⚠ No se pudo acceder a ${dirPath}: ${err.message}`);
    }
    return files;
  }
}