# ⬡ QASL·TOMEX
### Quantum Soul Scanner — El primer Tomógrafo de Testing Autónomo del mundo

```
"No es una herramienta. Está viva."
"Le ve el alma al código fuente."
```

**Autor:** Elyer Gregorio Maldonado — QA Automation Architect
**Ubicación:** Buenos Aires, Argentina
**Versión:** 2.0.0
**Estado:** OPERATIVO — Escaneando sitios reales en producción
**Clasificación:** PROPIETARIO — Código encriptado QASL·CIPHER
**Última actualización:** 11 de marzo de 2026

---

## ¿Qué es QASL·TOMEX?

QASL·TOMEX es el primer sistema autónomo de Quality Assurance del mundo
capaz de escanear **cualquier URL pública o privada** en **3 dimensiones simultáneas**,
diagnosticar sus problemas, corregirlos automáticamente,
y predecir fallos futuros — todo en menos de 70 segundos.

No necesita configuración. No necesita intervención humana.
Solo necesita la URL, las credenciales, y el ambiente.

**Universal:** funciona contra cualquier sitio web del mundo.
Probado exitosamente contra Mercado Libre Argentina, AGIP Buenos Aires, y aplicaciones internas.

---

## Modos de Ejecución

### CLI (línea de comandos)
```bash
node core/tomex.js https://app.com admin password staging
```

### Server + Dashboard (modo visual)
```bash
node core/tomex-server.js
# Abrir http://localhost:9999/qasl-tomex-v2.html
```

El dashboard muestra en tiempo real:
- Las 3 dimensiones escaneando en paralelo
- Issues detectados al instante vía SSE (Server-Sent Events)
- Score de salud final con animación
- Predicciones a 30 días

---

## Las 3 Dimensiones

```
DIMENSIÓN 1 — SUPERFICIE (Agente: GEMINI)
Lo que el usuario ve.
Playwright navega la app como un humano real.
17 checks automáticos:
  ✓ Errores de consola del navegador
  ✓ Excepciones JavaScript no capturadas
  ✓ Recursos fallidos (imágenes, scripts, CSS)
  ✓ 7 Security Headers (CSP, HSTS, X-Frame-Options, etc.)
  ✓ Verificación HTTPS y Mixed Content
  ✓ Imágenes rotas y sin atributo alt (WCAG)
  ✓ Formularios sin action, inputs sin labels
  ✓ Meta tags (title, description, viewport, lang)
  ✓ Performance (load time, FCP, peso de página)
  ✓ Status code HTTP
  ✓ Botones sin texto visible
  ✓ Links muertos
  ✓ Cookie security (HttpOnly, Secure)
  ✓ Server/X-Powered-By expuestos

DIMENSIÓN 2 — VENAS (Agente: GPT-4)
El flujo de datos interno.
Intercepta todas las APIs durante la navegación.
6 checks automáticos:
  ✓ Exceso de dominios terceros (tracking)
  ✓ APIs sin HTTPS
  ✓ Datos sensibles en URLs GET
  ✓ POST sin Content-Type
  ✓ Exceso de API calls (N+1)
  ✓ Endpoints debug/internal expuestos
Genera colección Postman automática + ejecución Newman.

DIMENSIÓN 3 — ALMA (Agente: CLAUDE)
El código fuente por dentro.
Modo local: AST parsing con acorn del repositorio completo.
Modo remoto: Análisis inteligente con Claude API desde el snapshot capturado.
Detecta:
  ✓ Bugs latentes
  ✓ Race conditions
  ✓ Vulnerabilidades de seguridad
  ✓ Deuda técnica
  ✓ Code smells
```

---

## Los 3 Médicos (Agentes IA)

```
🔵 CLAUDE    — Director + Cirujano Mayor (Alma del código)
               Modelo: claude-sonnet-4-6
               Rol: Orquesta todo, analiza código, consolida diagnóstico

🟢 GPT-4     — Especialista Venas (APIs + Performance)
               Modelo: gpt-4-turbo
               Rol: Analiza endpoints, vulnerabilidades API, performance

🟣 GEMINI    — Especialista Superficie (Visual + Accesibilidad)
               Modelo: gemini-pro
               Rol: Analiza UI, accesibilidad, UX issues
```

Trabajan **en paralelo**. Se comunican vía **QASL·CIPHER** —
protocolo encriptado AES-256 entre agentes.

---

## Las 7 Fases del Escaneo

```
FASE 0 — DESPERTAR
  Verifica conectividad de los 3 agentes IA
  Inicia protocolo CIPHER

FASE 1 — SNAPSHOT
  Playwright navega la URL target
  Captura DOM, formularios, APIs, headers, console errors
  Login automático si hay credenciales
  Métricas de performance del navegador

FASE 2 — ESCANEO (3 dimensiones en paralelo)
  SUPERFICIE: 17 checks de UI, seguridad, accesibilidad, performance
  VENAS: Análisis de APIs capturadas + colección Newman
  ALMA: AST local o análisis remoto con Claude

FASE 3 — DIAGNÓSTICO
  Claude consolida hallazgos de los 3 agentes
  Clasifica por severidad: CRITICAL / HIGH / MEDIUM / LOW

FASE 4 — AUTO-HEAL
  Intenta corregir automáticamente issues críticos y altos
  Rollback si el fix rompe algo

FASE 5 — PREDICCIÓN
  Claude predice fallos futuros a 7, 14 y 30 días
  Cada predicción incluye probabilidad y acción preventiva

FASE 6 — REPORTE
  Genera reporte HTML visual
  Genera JSON con datos crudos
  Genera colección Postman de todas las APIs
```

---

## Resultados Reales — Mercado Libre Argentina

Escaneado el 11 de marzo de 2026:

```
URL:        https://www.mercadolibre.com.ar/
Score:      10/100
Duración:   69 segundos
Issues:     18 (0 críticos, 0 altos, 12 medios, 6 bajos)

HALLAZGOS:
✗ X-Frame-Options ausente — vulnerable a clickjacking
✗ Permissions-Policy ausente — trackers acceden a cámara/micro/geo
✗ Server expone "Tengine" — facilita reconocimiento
✗ 170 requests en una sola carga (recomendado < 80)
✗ 3.09 MB de transferencia
✗ 7 recursos de tracking fallidos (mercadoclics.com)
✗ 17 imágenes sin alt (WCAG 1.1.1)
✗ 17 botones sin texto visible
✗ 8 dominios terceros contactados
✗ 5 predicciones a 30 días con acciones preventivas
```

---

## Dashboard Cinematográfico

El dashboard visual (`qasl-tomex-v2.html`) incluye:

- **Diseño glass-morphism** con fondo navy gradiente
- **3 anillos orbitales** representando las dimensiones
- **3 partículas** representando los agentes (Claude, GPT-4, Gemini)
- **Terminal de logs** en tiempo real vía SSE
- **Panel de input** con URL, usuario, password, ambiente
- **Overlay de resultados** con score animado
- **Comunicación en vivo** con el servidor via Server-Sent Events

---

## Reporte HTML

El reporte generado (`reports/tomex-report-*.html`) incluye:

- Score de salud visual con anillo SVG animado
- Resumen de issues por severidad (CRITICAL/HIGH/MEDIUM/LOW)
- Tabla de hallazgos con descripción y ubicación
- Auto-fixes aplicados
- Predicciones a 30 días con probabilidad y acciones preventivas
- Estado de los 3 agentes
- Tipografía grande y legible — diseñado para presentar a clientes
- Ancho de 1200px para pantallas grandes

---

## Estructura del Repositorio

```
qasl-tomex/
├── core/
│   ├── tomex.js                   ← Entry point CLI
│   ├── tomex-server.js            ← Express + SSE (puerto 9999)
│   └── orchestrator.js            ← Cerebro: 7 fases, EventEmitter
│
├── scanner/
│   ├── surface/
│   │   └── surface-scanner.js     ← Playwright + 17 checks universales
│   ├── veins/
│   │   └── api-capture.js         ← API capture + 6 checks + Newman + Postman
│   └── soul/
│       └── ast-analyzer.js        ← AST con acorn + Claude API
│
├── brain/
│   ├── SUPER-PROMPT.md            ← La constitución de TOMEX
│   ├── agents/
│   │   ├── gpt4-agent.js          ← OpenAI API wrapper
│   │   └── gemini-agent.js        ← Google AI API wrapper
│   ├── prompts/
│   │   ├── static/                ← Prompts base predefinidos
│   │   ├── dynamic/               ← Prompts generados por TOMEX
│   │   └── adaptive/              ← Prompts que se mejoran solos
│   └── cipher/
│       └── CIPHER-PROTOCOL.md     ← Protocolo secreto entre LLMs
│
├── healer/
│   └── fixes/auto-fix.js          ← Auto-fix engine
│
├── predictor/
│   └── predictor.js               ← Predicción de fallos futuros con Claude
│
├── reporter/
│   └── reporter.js                ← Generador de reportes HTML + JSON
│
├── encryptor/
│   └── cipher.js                  ← QASL·CIPHER — AES-256 entre agentes
│
├── apps/
│   └── demo-patient/              ← App demo con 5 vulnerabilidades (puerto 3007)
│
├── reports/                       ← Reportes HTML + JSON + Colecciones Postman
├── qasl-tomex-v2.html             ← Dashboard cinematográfico
└── TOMEX-README.md
```

---

## Requisitos

```
Node.js >= 18
npm install (instala todas las dependencias)

API Keys (en variables de entorno):
  ANTHROPIC_API_KEY    — Claude (obligatorio — es el Director)
  OPENAI_API_KEY       — GPT-4 (opcional — enriquece Venas)
  GOOGLE_AI_API_KEY    — Gemini (opcional — enriquece Superficie)
```

---

## Puertos

| Puerto | Servicio |
|--------|----------|
| 3007   | Demo Patient App (app con vulnerabilidades intencionales) |
| 9999   | TOMEX Server (dashboard + SSE + API de escaneo) |

---

## Capacidades Únicas

| Capacidad | TOMEX | Cualquier otra herramienta |
|-----------|-------|---------------------------|
| Scanner universal (cualquier URL) | ✅ | ❌ |
| 3 dimensiones simultáneas | ✅ | ❌ |
| Un solo comando | ✅ | ❌ |
| 17 checks de superficie automáticos | ✅ | ❌ |
| 6 checks de APIs automáticos | ✅ | ❌ |
| Security headers analysis | ✅ | Parcial |
| Genera colección Postman automática | ✅ | ❌ |
| Auto-fix en repositorio | ✅ | ❌ |
| Predicción de fallos a 30 días | ✅ | ❌ |
| Dashboard en tiempo real con SSE | ✅ | ❌ |
| 3 LLMs coordinados en paralelo | ✅ | ❌ |
| Protocolo encriptado entre agentes | ✅ | ❌ |
| Reporte HTML visual para clientes | ✅ | Parcial |
| Login automático multi-selector | ✅ | ❌ |
| Adaptación automática URL externa/local | ✅ | ❌ |

---

## Changelog

### v2.0.0 (11 marzo 2026) — Scanner Universal
- **Surface Scanner reescrito**: 17 checks reales que funcionan contra cualquier URL
- **Captura de consola, JS errors, recursos fallidos, security headers, performance**
- **Veins con análisis directo**: 6 checks de APIs sin depender solo de Newman
- **Soul adaptativo**: análisis AST local o remoto con Claude según contexto
- **Diagnóstico fusionado**: issues directos + insights de IA consolidados
- **Navegación robusta**: `domcontentloaded` en vez de `networkidle` para sitios pesados
- **User-Agent real**: Chrome 120 en vez de identificarse como bot
- **Newman con timeout**: evita cuelgues en APIs lentas

### v1.5.0 (9 marzo 2026) — Dashboard y Reportes
- Dashboard cinematográfico con glass-morphism
- Server SSE para comunicación en tiempo real
- Reporte HTML rediseñado con tipografía grande
- Login automático mejorado (selectores por ID primero)
- CollectionGenerator completo (body, headers, test scripts)
- AST analyzer con threshold ajustado y logging
- Fix de race condition SSE

### v1.0.0 — Versión inicial
- Arquitectura de 3 dimensiones
- 3 agentes IA coordinados
- Protocolo CIPHER
- CLI entry point

---

## Integración con Ecosistema QASL

```
QASL·VOICE   → Control por voz
QASL·NEXUS   → 12 microservicios de infraestructura
QASL·TOMEX   → El tomógrafo autónomo (este repositorio)
QASL·CIPHER  → Protocolo de comunicación entre LLMs
```

---

## Licencia y Protección

```
PROPIETARIO — Todos los derechos reservados
Elyer Gregorio Maldonado © 2026

Este software está protegido por QASL·CIPHER-ENCRYPT.
El código fuente está encriptado con AES-256.
Cualquier intento de acceso no autorizado será detectado y reportado.

Para licenciamiento comercial contactar al autor.
```

---

```
⬡ QASL·TOMEX v2.0 | Elyer Gregorio Maldonado | Buenos Aires, 2026
Powered by QASL·CIPHER Protocol
"Le ve el alma al código fuente"
```
