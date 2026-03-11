// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — API CAPTURE (DIMENSIÓN 2 — VENAS)
// Captura todas las APIs y genera colección Postman automática
// Analiza endpoints reales de CUALQUIER URL — universal
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import { writeFile } from 'fs/promises';
import { join } from 'path';

export class ApiCapture {

  // ── EXTRAER APIS DEL SNAPSHOT ──
  async extractFromSnapshot(snapshot) {
    const apis = snapshot.capturedApis || [];

    // Deduplicar por method + url base
    const unique = new Map();
    for (const api of apis) {
      const key = `${api.method}:${this.normalizeUrl(api.url)}`;
      if (!unique.has(key)) {
        unique.set(key, api);
      }
    }

    console.log(`[VEINS] ${unique.size} endpoints únicos detectados de ${apis.length} capturados`);
    return Array.from(unique.values());
  }

  normalizeUrl(url) {
    return url.replace(/\/\d+/g, '/:id').replace(/\?.*$/, '');
  }

  // ── ANALIZAR APIs CAPTURADAS (sin Newman, analisis directo) ──
  analyzeApis(apis, snapshot) {
    const issues = [];
    const baseUrl = snapshot.url;

    if (apis.length === 0) {
      console.log('[VEINS] ⚠ No se capturaron APIs — sitio sin XHR/Fetch detectables');
      return { issues, apiCount: 0, domains: [] };
    }

    // Contar dominios de terceros
    let baseDomain;
    try { baseDomain = new URL(baseUrl).hostname; } catch { baseDomain = ''; }
    const domains = new Map();
    for (const api of apis) {
      try {
        const domain = new URL(api.url).hostname;
        domains.set(domain, (domains.get(domain) || 0) + 1);
      } catch { /* skip */ }
    }

    // ── 1. APIs a dominios de terceros (tracking, analytics, etc.) ──
    const thirdParty = Array.from(domains.entries()).filter(([d]) => d !== baseDomain);
    if (thirdParty.length > 5) {
      issues.push({
        type: 'EXCESSIVE_THIRD_PARTY',
        severity: 'MEDIUM',
        description: `${thirdParty.length} dominios de terceros contactados — posible tracking excesivo o dependencias externas`,
        location: thirdParty.slice(0, 5).map(([d, c]) => `${d} (${c}x)`).join(', ')
      });
    }

    // ── 2. APIs sin HTTPS ──
    const httpApis = apis.filter(a => a.url.startsWith('http://'));
    if (httpApis.length > 0) {
      issues.push({
        type: 'API_NO_HTTPS',
        severity: 'HIGH',
        description: `${httpApis.length} llamadas API sin HTTPS — datos viajan sin cifrar`,
        location: httpApis.slice(0, 3).map(a => a.url.substring(0, 80)).join(', ')
      });
    }

    // ── 3. APIs que envían datos sensibles por GET ──
    const sensitiveGetApis = apis.filter(a => {
      if (a.method !== 'GET') return false;
      const url = a.url.toLowerCase();
      return url.includes('token') || url.includes('password') || url.includes('secret') ||
             url.includes('apikey') || url.includes('api_key') || url.includes('session');
    });
    if (sensitiveGetApis.length > 0) {
      issues.push({
        type: 'SENSITIVE_IN_URL',
        severity: 'HIGH',
        description: `${sensitiveGetApis.length} APIs envían datos sensibles en la URL (GET) — quedan en logs del servidor`,
        location: sensitiveGetApis.slice(0, 2).map(a => a.url.substring(0, 100)).join(', ')
      });
    }

    // ── 4. APIs POST sin Content-Type ──
    const postWithoutContentType = apis.filter(a => {
      if (a.method !== 'POST' && a.method !== 'PUT') return false;
      const ct = a.headers?.['content-type'] || '';
      return a.postData && !ct;
    });
    if (postWithoutContentType.length > 0) {
      issues.push({
        type: 'POST_NO_CONTENT_TYPE',
        severity: 'LOW',
        description: `${postWithoutContentType.length} requests POST/PUT sin Content-Type header`,
        location: baseUrl
      });
    }

    // ── 5. Exceso de APIs (indica SPA pesada o mal optimizada) ──
    if (apis.length > 50) {
      issues.push({
        type: 'EXCESSIVE_API_CALLS',
        severity: 'MEDIUM',
        description: `${apis.length} llamadas API en una sola carga de página — posible N+1 o falta de batching`,
        location: baseUrl
      });
    }

    // ── 6. APIs exponiendo versión/debug ──
    const debugApis = apis.filter(a => {
      const url = a.url.toLowerCase();
      return url.includes('/debug') || url.includes('/trace') || url.includes('/swagger') ||
             url.includes('/graphql') || url.includes('/__') || url.includes('/internal');
    });
    if (debugApis.length > 0) {
      issues.push({
        type: 'DEBUG_ENDPOINTS',
        severity: 'HIGH',
        description: `${debugApis.length} endpoints de debug/internal expuestos públicamente`,
        location: debugApis.slice(0, 3).map(a => a.url.substring(0, 100)).join(', ')
      });
    }

    // ── RESUMEN ──
    const criticals = issues.filter(i => i.severity === 'CRITICAL').length;
    const highs = issues.filter(i => i.severity === 'HIGH').length;
    const mediums = issues.filter(i => i.severity === 'MEDIUM').length;
    const lows = issues.filter(i => i.severity === 'LOW').length;
    console.log(`[VEINS] 🔍 Análisis API: ${issues.length} issues (${criticals}C/${highs}H/${mediums}M/${lows}L)`);
    console.log(`[VEINS] 📊 ${apis.length} APIs, ${domains.size} dominios (${thirdParty.length} terceros)`);

    return {
      issues,
      apiCount: apis.length,
      uniqueEndpoints: new Set(apis.map(a => this.normalizeUrl(a.url))).size,
      domains: Array.from(domains.entries()).map(([d, c]) => ({ domain: d, count: c })),
      thirdPartyCount: thirdParty.length,
      methods: {
        GET: apis.filter(a => a.method === 'GET').length,
        POST: apis.filter(a => a.method === 'POST').length,
        PUT: apis.filter(a => a.method === 'PUT').length,
        DELETE: apis.filter(a => a.method === 'DELETE').length
      }
    };
  }

  // ── EJECUTAR NEWMAN ──
  async runNewman(collection) {
    const newman = (await import('newman')).default;

    return new Promise((resolve) => {
      const results = { endpoints: 0, failures: 0, passed: 0, duration: 0 };

      newman.run({
        collection,
        reporters: ['cli'],
        reporter: { cli: { silent: false } },
        timeout: 15000,
        timeoutRequest: 5000
      }, (err, summary) => {
        if (err) {
          console.log('[VEINS] ⚠ Newman error — continuando sin resultados API');
          resolve(results);
          return;
        }
        results.endpoints = summary.run.stats.requests.total;
        results.failures = summary.run.stats.requests.failed;
        results.passed = results.endpoints - results.failures;
        results.duration = summary.run.timings.completed - summary.run.timings.started;
        resolve(results);
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════
// COLLECTION GENERATOR
// Genera colección Postman desde APIs capturadas
// ═══════════════════════════════════════════════════════════

export class CollectionGenerator {

  async generate(apis) {
    const collection = {
      info: {
        name: `QASL·TOMEX Auto-Generated — ${new Date().toISOString()}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: apis.map((api, i) => this.buildItem(api, i + 1))
    };

    // Guardar colección
    const path = `./reports/tomex-collection-${Date.now()}.json`;
    await writeFile(path, JSON.stringify(collection, null, 2)).catch(() => {});

    console.log(`[VEINS] ✓ Colección generada: ${apis.length} requests`);
    return collection;
  }

  buildItem(api, index) {
    const urlObj = new URL(api.url);

    return {
      name: `${String(index).padStart(2,'0')} ${api.method} ${urlObj.pathname}`,
      request: {
        method: api.method,
        header: this.sanitizeHeaders(api.headers || {}),
        url: {
          raw: api.url,
          protocol: urlObj.protocol.replace(':', ''),
          host: [urlObj.hostname],
          port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
          path: urlObj.pathname.split('/').filter(Boolean)
        },
        body: api.postData ? {
          mode: 'raw',
          raw: api.postData,
          options: { raw: { language: 'json' } }
        } : undefined
      },
      event: [{
        listen: 'test',
        script: {
          exec: [
            `pm.test("Status OK", () => {`,
            `  pm.expect(pm.response.code).to.be.oneOf([200,201,204,400,401,403,404]);`,
            `});`,
            `pm.test("Response time < 2000ms", () => {`,
            `  pm.expect(pm.response.responseTime).to.be.below(2000);`,
            `});`
          ]
        }
      }]
    };
  }

  sanitizeHeaders(headers) {
    const sensitive = ['authorization', 'cookie', 'x-api-key'];
    return Object.entries(headers)
      .filter(([k]) => !['host', 'content-length'].includes(k.toLowerCase()))
      .map(([k, v]) => ({
        key: k,
        value: sensitive.includes(k.toLowerCase()) ? '{{' + k.toUpperCase() + '}}' : v
      }));
  }
}
