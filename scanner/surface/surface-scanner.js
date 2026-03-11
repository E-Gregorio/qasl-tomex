// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — SURFACE SCANNER (DIMENSIÓN 1)
// MCP + Playwright navega la app como un humano real
// Ve: UI, formularios, selectores, flujos, comportamiento
// Escanea CUALQUIER URL — universal
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import { chromium } from 'playwright';

export class SurfaceScanner {

  constructor() {
    this.browser = null;
    this.page = null;
    this.capturedApis = [];
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.pageErrors = [];
    this.failedResources = [];
    this.responseHeaders = {};
    this.performanceMetrics = {};
  }

  // ── CAPTURA COMPLETA DEL SNAPSHOT ──
  async capture(target) {
    console.log('[SURFACE] Iniciando navegación con Playwright...');

    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true
    });

    this.page = await context.newPage();

    // ── LISTENERS DE CAPTURA ──

    // 1. Interceptar APIs (XHR + Fetch)
    this.page.on('request', req => {
      if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
        this.capturedApis.push({
          method: req.method(),
          url: req.url(),
          headers: req.headers(),
          postData: req.postData()
        });
      }
    });

    // 2. Capturar errores de consola
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push({ text: msg.text(), location: msg.location() });
      } else if (msg.type() === 'warning') {
        this.consoleWarnings.push({ text: msg.text(), location: msg.location() });
      }
    });

    // 3. Capturar errores de JavaScript (excepciones no capturadas)
    this.page.on('pageerror', error => {
      this.pageErrors.push({ message: error.message, stack: error.stack });
    });

    // 4. Capturar recursos fallidos (imágenes rotas, scripts que no cargan, etc.)
    this.page.on('requestfailed', req => {
      this.failedResources.push({
        url: req.url(),
        type: req.resourceType(),
        error: req.failure()?.errorText || 'unknown'
      });
    });

    const snapshot = {
      url: target.url,
      elements: 0,
      forms: 0,
      apis: 0,
      pages: [],
      selectors: {},
      screenshots: [],
      issues: [],
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
      failedResources: [],
      responseHeaders: {},
      performanceMetrics: {},
      repoPath: target.repoPath || './apps/demo-patient'
    };

    try {
      // Navegar a la URL — domcontentloaded es más confiable para sitios pesados
      const response = await this.page.goto(target.url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      // Esperar que cargue contenido visual
      await this.page.waitForTimeout(5000);

      // Capturar headers de respuesta del servidor
      if (response) {
        snapshot.statusCode = response.status();
        const headers = response.headers();
        snapshot.responseHeaders = headers;
        this.responseHeaders = headers;
      }

      // Capturar métricas de performance
      snapshot.performanceMetrics = await this.capturePerformance();

      // Login automático si hay credenciales
      if (target.user && target.pass) {
        await this.autoLogin(target);
      }

      // Capturar DOM completo
      snapshot.selectors = await this.captureDOM();
      snapshot.elements = Object.values(snapshot.selectors)
        .reduce((sum, arr) => sum + arr.length, 0);

      // Capturar formularios
      snapshot.forms = await this.captureForms();

      // Screenshot inicial
      const screenshot = await this.page.screenshot({ fullPage: true });
      snapshot.screenshots.push(screenshot);

      // Navegar links internos (crawl)
      snapshot.pages = await this.crawlPages(target.url);

      // Guardar datos capturados
      snapshot.apis = this.capturedApis.length;
      snapshot.capturedApis = this.capturedApis;
      snapshot.consoleErrors = this.consoleErrors;
      snapshot.consoleWarnings = this.consoleWarnings;
      snapshot.pageErrors = this.pageErrors;
      snapshot.failedResources = this.failedResources;

      console.log(`[SURFACE] ✓ ${snapshot.elements} elementos capturados`);
      console.log(`[SURFACE] ✓ ${snapshot.forms} formularios detectados`);
      console.log(`[SURFACE] ✓ ${snapshot.apis} APIs interceptadas`);
      console.log(`[SURFACE] ✓ ${this.consoleErrors.length} errores de consola`);
      console.log(`[SURFACE] ✓ ${this.pageErrors.length} errores JavaScript`);
      console.log(`[SURFACE] ✓ ${this.failedResources.length} recursos fallidos`);

    } finally {
      await this.browser.close();
    }

    return snapshot;
  }

  // ── PERFORMANCE METRICS ──
  async capturePerformance() {
    try {
      return await this.page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

        return {
          loadTime: Math.round(perf?.loadEventEnd - perf?.startTime) || 0,
          domContentLoaded: Math.round(perf?.domContentLoadedEventEnd - perf?.startTime) || 0,
          firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime) || 0,
          firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime) || 0,
          resourceCount: resources.length,
          totalTransferSize: totalSize,
          totalTransferSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        };
      });
    } catch {
      return { loadTime: 0, resourceCount: 0, totalTransferSize: 0 };
    }
  }

  // ── AUTO LOGIN ──
  async autoLogin(target) {
    console.log('[SURFACE] Intentando login automático...');

    const userSelectors = [
      '#username', '#user', '#email',
      'input[name="username"]', 'input[name="user"]', 'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="user" i]', 'input[placeholder*="email" i]',
      'input[id*="user" i]', 'input[id*="login" i]'
    ];

    const passSelectors = [
      '#password', '#pass',
      'input[type="password"]',
      'input[name="password"]', 'input[name="pass"]'
    ];

    let userFilled = false;
    for (const sel of userSelectors) {
      try {
        await this.page.fill(sel, target.user, { timeout: 2000 });
        console.log(`[SURFACE] ✓ Usuario llenado con: ${sel}`);
        userFilled = true;
        break;
      } catch { continue; }
    }

    let passFilled = false;
    for (const sel of passSelectors) {
      try {
        await this.page.fill(sel, target.pass, { timeout: 2000 });
        console.log(`[SURFACE] ✓ Password llenado con: ${sel}`);
        passFilled = true;
        break;
      } catch { continue; }
    }

    if (!userFilled || !passFilled) {
      console.log('[SURFACE] ⚠ No se encontraron campos de login');
      return;
    }

    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Iniciar")', 'button:has-text("Login")',
      'button:has-text("Log in")', 'button:has-text("Sign in")',
      'button:has-text("Ingresar")', 'button:has-text("Entrar")',
      'button:has-text("Acceder")', '#login button', 'form button'
    ];

    for (const sel of submitSelectors) {
      try {
        await this.page.click(sel, { timeout: 2000 });
        await this.page.waitForTimeout(1500);
        console.log(`[SURFACE] ✓ Login exitoso con: ${sel}`);
        return;
      } catch { continue; }
    }

    console.log('[SURFACE] ⚠ Login automático no completado — botón no encontrado');
  }

  // ── CAPTURAR DOM ──
  async captureDOM() {
    return await this.page.evaluate(() => {
      const best = el => {
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.id) return `#${el.id}`;
        if (el.name) return `[name="${el.name}"]`;
        if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
        return el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ')[0]}` : '');
      };

      return {
        buttons: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(el => ({
          selector: best(el), text: el.textContent?.trim().substring(0, 50), visible: el.offsetParent !== null
        })),
        inputs: Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          selector: best(el), type: el.type, name: el.name, placeholder: el.placeholder
        })),
        links: Array.from(document.querySelectorAll('a[href]')).map(el => ({
          selector: best(el), href: el.href, text: el.textContent?.trim().substring(0, 50)
        })),
        forms: Array.from(document.querySelectorAll('form')).map(el => ({
          selector: best(el), action: el.action, method: el.method,
          fields: Array.from(el.querySelectorAll('input, select, textarea')).length
        })),
        tables: Array.from(document.querySelectorAll('table')).map(el => ({
          selector: best(el), rows: el.querySelectorAll('tr').length
        })),
        images: Array.from(document.querySelectorAll('img')).map(el => ({
          src: el.src, alt: el.alt, naturalWidth: el.naturalWidth,
          broken: el.complete && el.naturalWidth === 0
        })),
        meta: {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || null,
          viewport: document.querySelector('meta[name="viewport"]')?.content || null,
          charset: document.characterSet,
          lang: document.documentElement.lang || null,
          canonical: document.querySelector('link[rel="canonical"]')?.href || null
        }
      };
    });
  }

  // ── CAPTURAR FORMULARIOS ──
  async captureForms() {
    const forms = await this.page.$$('form');
    return forms.length;
  }

  // ── CRAWL DE PÁGINAS ──
  async crawlPages(baseUrl) {
    const visited = new Set([baseUrl]);
    const pages = [];

    const links = await this.page.$$eval('a[href]', els =>
      els.map(el => el.href).filter(h => h.startsWith(window.location.origin))
    );

    for (const link of links.slice(0, 10)) {
      if (!visited.has(link)) {
        visited.add(link);
        pages.push(link);
      }
    }

    return pages;
  }

  // ═══════════════════════════════════════════════════════════
  // ANÁLISIS COMPLETO DE LA SUPERFICIE — UNIVERSAL
  // 15+ checks reales que funcionan en CUALQUIER URL
  // ═══════════════════════════════════════════════════════════
  async analyze(snapshot) {
    const issues = [];
    const url = snapshot.url;

    // ── 1. ERRORES DE CONSOLA DEL NAVEGADOR ──
    if (snapshot.consoleErrors?.length > 0) {
      for (const err of snapshot.consoleErrors.slice(0, 10)) {
        issues.push({
          type: 'CONSOLE_ERROR',
          severity: 'MEDIUM',
          description: `Error de consola: ${err.text.substring(0, 200)}`,
          location: url
        });
      }
    }

    // ── 2. ERRORES JAVASCRIPT (excepciones no capturadas) ──
    if (snapshot.pageErrors?.length > 0) {
      for (const err of snapshot.pageErrors.slice(0, 5)) {
        issues.push({
          type: 'JS_EXCEPTION',
          severity: 'HIGH',
          description: `Excepción JavaScript no capturada: ${err.message.substring(0, 200)}`,
          location: url
        });
      }
    }

    // ── 3. RECURSOS FALLIDOS (imágenes rotas, scripts que no cargan) ──
    if (snapshot.failedResources?.length > 0) {
      for (const res of snapshot.failedResources.slice(0, 10)) {
        const sev = (res.type === 'script' || res.type === 'stylesheet') ? 'HIGH' : 'MEDIUM';
        issues.push({
          type: 'RESOURCE_FAILED',
          severity: sev,
          description: `Recurso fallido (${res.type}): ${res.error} — ${res.url.substring(0, 150)}`,
          location: url
        });
      }
    }

    // ── 4. SECURITY HEADERS ──
    const headers = snapshot.responseHeaders || {};
    const securityChecks = [
      { header: 'content-security-policy', name: 'Content-Security-Policy', severity: 'HIGH',
        desc: 'Falta header Content-Security-Policy — vulnerable a XSS e inyección de contenido' },
      { header: 'x-frame-options', name: 'X-Frame-Options', severity: 'MEDIUM',
        desc: 'Falta header X-Frame-Options — vulnerable a clickjacking' },
      { header: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'MEDIUM',
        desc: 'Falta header X-Content-Type-Options — vulnerable a MIME sniffing' },
      { header: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'HIGH',
        desc: 'Falta header HSTS — conexiones pueden ser degradadas a HTTP' },
      { header: 'x-xss-protection', name: 'X-XSS-Protection', severity: 'LOW',
        desc: 'Falta header X-XSS-Protection — protección XSS del navegador desactivada' },
      { header: 'referrer-policy', name: 'Referrer-Policy', severity: 'LOW',
        desc: 'Falta header Referrer-Policy — puede exponer URLs sensibles a terceros' },
      { header: 'permissions-policy', name: 'Permissions-Policy', severity: 'LOW',
        desc: 'Falta header Permissions-Policy — sin control sobre APIs del navegador (cámara, micro, geo)' }
    ];

    for (const check of securityChecks) {
      if (!headers[check.header]) {
        issues.push({
          type: 'MISSING_SECURITY_HEADER',
          severity: check.severity,
          description: `${check.desc}`,
          location: `Header: ${check.name}`
        });
      }
    }

    // ── 5. HTTPS CHECK ──
    if (url.startsWith('http://')) {
      issues.push({
        type: 'NO_HTTPS',
        severity: 'CRITICAL',
        description: 'El sitio no usa HTTPS — tráfico expuesto a interceptación',
        location: url
      });
    }

    // ── 6. MIXED CONTENT ──
    if (url.startsWith('https://') && snapshot.capturedApis) {
      const httpApis = snapshot.capturedApis.filter(a => a.url.startsWith('http://'));
      if (httpApis.length > 0) {
        issues.push({
          type: 'MIXED_CONTENT',
          severity: 'HIGH',
          description: `Mixed content: ${httpApis.length} requests HTTP en página HTTPS`,
          location: url
        });
      }
    }

    // ── 7. IMÁGENES ROTAS ──
    if (snapshot.selectors?.images) {
      const broken = snapshot.selectors.images.filter(img => img.broken);
      if (broken.length > 0) {
        issues.push({
          type: 'BROKEN_IMAGES',
          severity: 'MEDIUM',
          description: `${broken.length} imágenes rotas detectadas (no cargan)`,
          location: url
        });
      }
    }

    // ── 8. IMÁGENES SIN ALT (accesibilidad) ──
    if (snapshot.selectors?.images) {
      const noAlt = snapshot.selectors.images.filter(img => !img.alt || img.alt.trim() === '');
      if (noAlt.length > 3) {
        issues.push({
          type: 'IMAGES_NO_ALT',
          severity: 'MEDIUM',
          description: `${noAlt.length} imágenes sin atributo alt — accesibilidad comprometida (WCAG 1.1.1)`,
          location: url
        });
      }
    }

    // ── 9. FORMULARIOS SIN ACTION ──
    if (snapshot.selectors?.forms) {
      for (const form of snapshot.selectors.forms) {
        if (!form.action || form.action === '#' || form.action === '') {
          issues.push({
            type: 'FORM_NO_ACTION',
            severity: 'MEDIUM',
            description: `Formulario sin action definido: ${form.selector}`,
            location: url
          });
        }
      }
    }

    // ── 10. INPUTS SIN IDENTIFICACIÓN ──
    if (snapshot.selectors?.inputs) {
      const unlabeled = snapshot.selectors.inputs.filter(i => !i.name && !i.placeholder);
      if (unlabeled.length > 0) {
        issues.push({
          type: 'INPUTS_NO_LABEL',
          severity: 'LOW',
          description: `${unlabeled.length} inputs sin name ni placeholder — accesibilidad comprometida`,
          location: url
        });
      }
    }

    // ── 11. META TAGS ──
    const meta = snapshot.selectors?.meta || {};

    if (!meta.title || meta.title.trim() === '') {
      issues.push({
        type: 'MISSING_TITLE',
        severity: 'MEDIUM',
        description: 'La página no tiene título (<title>) — afecta SEO y usabilidad',
        location: url
      });
    }

    if (!meta.description) {
      issues.push({
        type: 'MISSING_META_DESC',
        severity: 'LOW',
        description: 'Falta meta description — afecta SEO y visibilidad en buscadores',
        location: url
      });
    }

    if (!meta.viewport) {
      issues.push({
        type: 'MISSING_VIEWPORT',
        severity: 'MEDIUM',
        description: 'Falta meta viewport — la página no es responsive en móviles',
        location: url
      });
    }

    if (!meta.lang) {
      issues.push({
        type: 'MISSING_LANG',
        severity: 'LOW',
        description: 'Falta atributo lang en <html> — accesibilidad y SEO afectados',
        location: url
      });
    }

    // ── 12. PERFORMANCE ──
    const perf = snapshot.performanceMetrics || {};

    if (perf.loadTime > 5000) {
      issues.push({
        type: 'SLOW_LOAD',
        severity: perf.loadTime > 10000 ? 'HIGH' : 'MEDIUM',
        description: `Página lenta: ${(perf.loadTime / 1000).toFixed(1)}s de carga (recomendado < 3s)`,
        location: url
      });
    }

    if (perf.firstContentfulPaint > 3000) {
      issues.push({
        type: 'SLOW_FCP',
        severity: 'MEDIUM',
        description: `First Contentful Paint lento: ${(perf.firstContentfulPaint / 1000).toFixed(1)}s (recomendado < 1.8s)`,
        location: url
      });
    }

    if (perf.totalTransferSize > 5 * 1024 * 1024) {
      issues.push({
        type: 'HEAVY_PAGE',
        severity: 'MEDIUM',
        description: `Página pesada: ${perf.totalTransferSizeMB}MB transferidos (${perf.resourceCount} recursos)`,
        location: url
      });
    }

    if (perf.resourceCount > 100) {
      issues.push({
        type: 'TOO_MANY_RESOURCES',
        severity: 'LOW',
        description: `Exceso de recursos: ${perf.resourceCount} requests (recomendado < 80)`,
        location: url
      });
    }

    // ── 13. STATUS CODE ──
    if (snapshot.statusCode && snapshot.statusCode >= 400) {
      issues.push({
        type: 'HTTP_ERROR',
        severity: snapshot.statusCode >= 500 ? 'CRITICAL' : 'HIGH',
        description: `Respuesta HTTP ${snapshot.statusCode} — el servidor respondió con error`,
        location: url
      });
    }

    // ── 14. BOTONES SIN TEXTO (accesibilidad) ──
    if (snapshot.selectors?.buttons) {
      const emptyButtons = snapshot.selectors.buttons.filter(b => !b.text || b.text.trim() === '');
      if (emptyButtons.length > 0) {
        issues.push({
          type: 'BUTTONS_NO_TEXT',
          severity: 'LOW',
          description: `${emptyButtons.length} botones sin texto visible — accesibilidad comprometida`,
          location: url
        });
      }
    }

    // ── 15. LINKS INTERNOS ROTOS (detectados en crawl) ──
    if (snapshot.selectors?.links) {
      const emptyLinks = snapshot.selectors.links.filter(l => !l.href || l.href === '#' || l.href.endsWith('javascript:void(0)'));
      if (emptyLinks.length > 3) {
        issues.push({
          type: 'DEAD_LINKS',
          severity: 'LOW',
          description: `${emptyLinks.length} links vacíos o con javascript:void(0)`,
          location: url
        });
      }
    }

    // ── 16. COOKIE SECURITY (server header) ──
    const setCookie = headers['set-cookie'] || '';
    if (setCookie && !setCookie.toLowerCase().includes('httponly')) {
      issues.push({
        type: 'COOKIE_NO_HTTPONLY',
        severity: 'MEDIUM',
        description: 'Cookies sin flag HttpOnly — accesibles desde JavaScript (riesgo XSS)',
        location: 'Set-Cookie header'
      });
    }
    if (setCookie && !setCookie.toLowerCase().includes('secure')) {
      issues.push({
        type: 'COOKIE_NO_SECURE',
        severity: 'MEDIUM',
        description: 'Cookies sin flag Secure — pueden enviarse por HTTP sin cifrar',
        location: 'Set-Cookie header'
      });
    }

    // ── 17. SERVER HEADER EXPOSURE ──
    if (headers['server']) {
      issues.push({
        type: 'SERVER_EXPOSED',
        severity: 'LOW',
        description: `Header Server expone tecnología: "${headers['server']}" — facilita reconocimiento para atacantes`,
        location: 'Server header'
      });
    }
    if (headers['x-powered-by']) {
      issues.push({
        type: 'POWERED_BY_EXPOSED',
        severity: 'MEDIUM',
        description: `Header X-Powered-By expone stack: "${headers['x-powered-by']}" — información útil para atacantes`,
        location: 'X-Powered-By header'
      });
    }

    // ── RESUMEN ──
    const criticals = issues.filter(i => i.severity === 'CRITICAL').length;
    const highs = issues.filter(i => i.severity === 'HIGH').length;
    const mediums = issues.filter(i => i.severity === 'MEDIUM').length;
    const lows = issues.filter(i => i.severity === 'LOW').length;
    console.log(`[SURFACE] 🔍 Análisis completo: ${issues.length} issues (${criticals}C/${highs}H/${mediums}M/${lows}L)`);

    return {
      issues,
      elements: snapshot.elements,
      forms: snapshot.forms,
      apis: snapshot.apis,
      pages: snapshot.pages?.length || 0,
      consoleErrors: snapshot.consoleErrors?.length || 0,
      pageErrors: snapshot.pageErrors?.length || 0,
      failedResources: snapshot.failedResources?.length || 0,
      performance: snapshot.performanceMetrics || {},
      securityHeaders: this.summarizeSecurityHeaders(headers)
    };
  }

  // ── RESUMEN DE SECURITY HEADERS ──
  summarizeSecurityHeaders(headers) {
    const check = h => headers[h] ? '✓' : '✗';
    return {
      csp: check('content-security-policy'),
      hsts: check('strict-transport-security'),
      xFrameOptions: check('x-frame-options'),
      xContentType: check('x-content-type-options'),
      xXssProtection: check('x-xss-protection'),
      referrerPolicy: check('referrer-policy'),
      permissionsPolicy: check('permissions-policy')
    };
  }
}
