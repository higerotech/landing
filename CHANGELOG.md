# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido
- `.githooks/pre-push` rechaza los pushes directos a `main`, con su activación por
  `core.hooksPath` documentada en `CONTRIBUTING.md`. Es un sustituto local y parcial: no
  exige los security gates ni alcanza los merges desde la web.

### Corregido
- El gate de secretos no escaneaba nada, por dos causas encadenadas: `gitleaks-action` exige
  licencia en repos de organización y abortaba con «missing gitleaks license», y una vez
  resuelta moría con «Resource not accessible by integration» porque el bloque global
  `permissions: contents: read` no cubre la API de PRs que el action necesita. El workflow ya
  le pasa `GITLEAKS_LICENSE` y le concede `pull-requests: write` **por job**, dejando los
  otros cuatro sin ese acceso. Gate 2 daba por cubierto un control inexistente desde que se
  documentó; el primer escaneo real no encontró filtraciones.
- Registrado el alcance verdadero del gate: escanea el rango de commits del evento
  (`--log-opts=--no-merges --first-parent`), no el historial. La revisión del pasado se hizo
  aparte con el binario de gitleaks sobre los 9 commits del repo, sin hallazgos.
- Los enlaces de comparación del changelog y `org.opencontainers.image.source` apuntaban a
  `higerotech/website`; el repositorio se publicó como `higerotech/landing`.

### Pendiente de decisión humana
- Confirmar el dominio definitivo. `https://higerotech.com/` está asumido en `canonical`,
  `hreflang`, Open Graph, JSON-LD, `robots.txt` y `sitemap.xml`.
- Configurar `CONTACT.whatsapp` en `index.html`. Mientras esté vacío el botón de WhatsApp
  no se publica.
- Diagnosticar el contenedor de producción en estado `unhealthy` y decidir el redespliegue.
- Proteger `main` en el servidor: la org está en plan Free y el repo es privado, y GitHub no
  ofrece branch protection ni rulesets en esa combinación. Salidas: subir a GitHub Team
  (mantiene el repo privado) o hacerlo público. Hasta entonces la única barrera es el hook.
- Recuperar `scripts/gitgraph_from_log.py`, que `CONTRIBUTING.md` y el registro de 0.3.0 dan
  por existente pero no está versionado, o corregir ambas referencias.

## [0.3.0] - 2026-07-29

Fases 03 y 05 documentadas. Gate 2 y Gate 4 quedan **abiertos** con su razón registrada.

### Añadido
- `docs/03-implementation/repo-history.md`: `gitGraph` y bitácora derivados del historial
  real con `gitgraph_from_log.py`, más la trazabilidad tag ↔ versión ↔ ADR.
- `docs/05-deployment/deployment.md`: `C4Deployment` de la topología, `flowchart` del
  pipeline con su ruta de rollback, `gantt` de cutover, tabla de verificación ejecutada
  contra la imagen construida y runbook de rollback con disparadores.
- `CHANGELOG.md` y `README.md` reescrito como índice de la documentación AI-DLC.

### Corregido
- Documentado que el rollback descrito **no es ejecutable hoy**: `docker-compose.yml` fija
  `image: …:latest` y no se conservan imágenes etiquetadas por versión.

## [0.2.0] - 2026-07-29

Cierre de **Gate 1 — Diseño**.

### Añadido
- `docs/02-design/architecture.md` con las cinco vistas: `C4Container`, `C4Component`,
  `sequenceDiagram` de la primera visita, `stateDiagram-v2` del nodo i18n y
  `erDiagram` + `classDiagram` del modelo de contenido.
- `docs/02-design/threat-model.md`: DFD con cinco fronteras de confianza, STRIDE por
  componente y 16 amenazas priorizadas por DREAD.
- ADR-0002 — cabeceras de seguridad como snippet incluido en cada `location`.
- ADR-0003 — archivo único sin build, con `'unsafe-inline'` como deuda registrada.
- ADR-0004 — autoalojar las fuentes y eliminar toda dependencia de CDN.
- ADR-0005 — la página debe ser legible sin JavaScript.
- Contrato HTTP de rutas, códigos y cabeceras (el sistema no expone API).

### Seguridad
- T4 (`'unsafe-inline'` en la CSP) y T9 (HTTP plano host interno) registrados como
  **riesgos aceptados** con disparador de revisión explícito, no como controles cumplidos.

## [0.1.0] - 2026-07-29

Cierre de **Gate 0 — Requisitos**. Adopción de AI-DLC en variante polyrepo.

### Añadido
- `docs/00-project/charter.md` con `mindmap` de alcance, restricciones, métricas y riesgos.
- `docs/00-project/glossary.md`: lenguaje ubicuo, incluidos los términos del dominio
  venezolano que aparecen en el copy (IGTF, SUDEBAN 001-21, NIC 29/NIIF 13, CRDT).
- `docs/00-project/data-classification.md`: el sistema no trata datos personales; se
  documenta por qué y qué cambiaría al añadir un formulario.
- `docs/01-requirements/landing-corporativa.md`: PRD con `C4Context`, `journey`,
  `requirementDiagram`, DFD, `quadrantChart` DREAD, escenarios de abuso EA01–EA06 y
  requisitos de seguridad RS01–RS07 mapeados a ASVS nivel L1.
- ADR-0001 — adopción de la estructura AI-DLC en variante polyrepo.
- `.ai-dlc/` con los seis checklists de gate, plantillas y mapeo OWASP Top 10:2025 adaptado
  al alcance real, marcando qué **no aplica** y por qué.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`.
- Pipeline `.github/workflows/security-gates.yml` con siete gates, incluyendo verificación
  de cabeceras en cuatro rutas distintas y comprobación de códigos 404 reales.

## [0.0.2] - 2026-07-29

Correcciones de la revisión previa a la adopción de AI-DLC. Sin cambios de contenido
editorial: el copy y el diseño son los mismos.

### Corregido
- **CTA de WhatsApp muerto.** Apuntaba a `https://wa.me/` sin número. Ahora el `href` se
  compone desde `CONTACT.whatsapp` y el botón queda oculto mientras no esté configurado.
- **El 80 % de la página era invisible sin JavaScript.** Los 15 elementos `.reveal` tenían
  `opacity: 0` y dependían por completo de `IntersectionObserver`. Añadidos `<noscript>`,
  rama de respaldo y regla de `prefers-reduced-motion`.
- **Menú inalcanzable en móvil.** `.nav-links` se ocultaba bajo 980 px sin reemplazo.
  Añadida hamburguesa con `aria-expanded`, cierre con Escape y al pulsar un enlace.
- **Contraste insuficiente.** `--text-dim` daba 3,94:1 sobre `--ink`, por debajo del 4,5:1
  que exige WCAG AA para texto pequeño. Ahora 6,49:1 sobre `--ink` y 4,78:1 sobre
  `--dark-3`, el peor fondo donde se usa.
- **Soft 404.** `try_files … /index.html` devolvía 200 con la landing para cualquier ruta.
  Ahora responde 404 real con página propia.
- `Cache-Control` duplicado en los assets (`expires` y `add_header` emitían ambos).
- Saltos de nivel de encabezado (h2 → h4) en las secciones de arquitectura y valores.
- `assets/icon_calendar.png` pesaba 0 bytes; eliminado.
- Año del pie hardcodeado; ahora se calcula.

### Añadido
- Fuentes **autoalojadas** (Inter y Space Grotesk, SIL OFL 1.1). Se declaran como fuentes
  variables con rango `400 700`: un archivo por familia y subset en vez de cuatro copias
  idénticas. Con `unicode-range`, un visitante ES/EN descarga solo `latin` (~70 KB).
- Open Graph, Twitter Card, `canonical`, `hreflang`, JSON-LD de `ProfessionalService` y
  tarjeta social 1200×630.
- `robots.txt`, `sitemap.xml` y página `404.html` con la identidad del sitio.
- Idioma persistente e indexable: `?lang=en` → `localStorage` → `es`.
- Foco visible para navegación por teclado, `aria-hidden` en los 34 SVG decorativos,
  `aria-pressed` en el selector de idioma y `aria-label` en el botón de menú.

### Seguridad
- **Las cabeceras de seguridad no llegaban a la home ni a los assets.** En nginx,
  `add_header` solo se hereda del nivel superior si el nivel actual no declara ninguna
  propia; como varios `location` añadían su `Cache-Control`, descartaban las cuatro
  cabeceras del bloque `server`. Extraídas a `security-headers.conf` e incluidas
  explícitamente en cada `location`.
- Añadidos `Content-Security-Policy`, `Cross-Origin-Opener-Policy`,
  `Cross-Origin-Resource-Policy` y `server_tokens off`.
- `X-Frame-Options` pasa de `SAMEORIGIN` a `DENY`.
- Eliminada la dependencia de `fonts.googleapis.com`, que bloqueaba el render y exponía la
  IP de cada visitante a un tercero.
- Contenedor endurecido: `read_only`, `cap_drop: ALL`, `no-new-privileges`, límites de CPU
  y memoria, `nginx -t` en tiempo de build.
- `location ~ /\.` deniega rutas ocultas; `.dockerignore` impide que `.git` o `.env`
  lleguen al contexto de build.

## [0.0.1] - 2026-07-14

### Añadido
- Línea base: landing monolítica (`index.html`), assets, `Dockerfile`, `nginx.conf` y
  `docker-compose.yml`. Registrada intacta en el commit `f09c213` antes de cualquier
  corrección, para que diagnóstico y arreglo sean auditables por separado.

[Unreleased]: https://github.com/higerotech/landing/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/higerotech/landing/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/higerotech/landing/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/higerotech/landing/releases/tag/v0.1.0
[0.0.2]: https://github.com/higerotech/landing/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/higerotech/landing/releases/tag/v0.0.1
