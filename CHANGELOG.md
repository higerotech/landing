# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido
- Badges de gates de seguridad, pruebas y versión en `README.md`. Son **estáticos** por
  necesidad: con el repositorio privado, el proxy de imágenes de GitHub pide los badges sin
  autenticar y todo endpoint dinámico responde 404 o «repo not found» (comprobado contra el
  badge propio de GitHub y dos de shields.io). Las URLs dinámicas equivalentes quedan
  comentadas en el propio README para cuando el repositorio deje de ser privado. El badge de
  pruebas dice **«sin suite»**, que es la verdad: no hay ninguna prueba automatizada.
- `.githooks/pre-push` rechaza los pushes directos a `main`, con su activación por
  `core.hooksPath` documentada en `CONTRIBUTING.md`. Es un sustituto local y parcial: no
  exige los security gates ni alcanza los merges desde la web.

### Cambiado
- `docker-compose.yml` publica en el **puerto 80** del host, antes 8080. No es una preferencia:
  el ingress del túnel de Cloudflare apunta a `http://<IP del host>:80`, así que cualquier otro
  puerto deja el sitio público sin servir aunque el contenedor esté sano. Queda escrito al lado
  de la directiva para que no se «limpie» en el futuro. Que el origen sea la IP del host y no la
  del contenedor es lo que permitió recrearlo con compose sin tocar el enrutado.
- **El borde deja de ser un `<TODO>`.** Confirmado con `docker inspect landing-tunnel` y sus
  logs de configuración: es cloudflared en modo token, el *ingress* vive en el panel de
  Cloudflare —no en el repositorio ni en el host—, enruta `www`, `web` y `demo` a
  `http://192.168.1.44:80` con regla final `http_status:404`, y **TLS lo termina Cloudflare**.
  Con eso se cierran tres huecos que arrastraban `<TODO>`: la dependencia D4 de los requisitos,
  la amenaza T9 del threat model y el A04 del mapeo OWASP. HSTS sigue pendiente y solo puede
  activarse en el borde, nunca desde nginx.

### Seguridad
- **Producción redesplegada, y hasta hoy no servía ninguna de las correcciones de este
  repositorio.** El contenedor que publicaba el sitio se creó el 2026-07-14 con `docker run` y
  medido con `curl -sI` no enviaba **ninguna** de las cinco cabeceras de seguridad, exponía
  `Server: nginx/1.27.5` (el gate G7 comprueba precisamente que la versión no se filtre) y
  corría la imagen base con los 36 CVEs corregibles —2 CRITICAL, 34 HIGH— que se cerraron esta
  misma semana. Tampoco tenía el endurecimiento del compose: `ReadonlyRootfs: false`,
  `CapDrop: []`. Los gates G5 y G7 pasaban en verde en cada PR **contra la imagen**, mientras
  el sitio real los fallaba los dos: avalar un artefacto no es avalar lo publicado, y el
  pipeline no distinguía las dos cosas. Tras el cutover con `docker compose up -d --build`,
  verificado: `healthy` por primera vez en la vida del servicio, `read_only=true` y
  `cap_drop=[ALL]` activos en el contenedor que corre, las cinco cabeceras y `404` real en
  local, y las cuatro que Cloudflare propaga más `404` real en `www`, `web` y `demo`.
- El contenedor anterior **no se borró**: al intentar etiquetarlo como punto de rollback su
  imagen ya no existía en el almacén (`docker image inspect` → *No such image*, y
  `docker commit` → *content digest not found*). Llevaba semanas sirviendo desde un montaje
  vivo cuyas capas habían desaparecido: irreconvertible en imagen y única copia de lo
  publicado. Se apartó con `--restart=no`, renombrado a `higerotech-landing-pre-cutover` y
  detenido, y su contenido se extrajo con `docker cp`. Borrar ese contenedor destruye la última
  copia. Refuerza el `<TODO>` del runbook de rollback: no basta con etiquetar por versión, hay
  que empujar las imágenes a un registro, porque una etiqueta local no sobrevive a un
  `docker system prune`.
- `aquasecurity/trivy-action` anclado por SHA de commit (`ed142fd`, v0.36.0) en sus dos usos,
  antes en `@master`. El job que avala las imágenes que se despliegan ejecutaba lo último de
  una rama móvil, por delante incluso de la última release publicada: quien controlase esa
  rama ejecutaba código en el CI. Se ancla por SHA y no por tag porque un tag también lo
  puede repuntar el dueño del repositorio.
- Imagen base actualizada de `nginx:1.27-alpine` (Alpine 3.21.3) a `nginx:1.30-alpine`
  (Alpine 3.24.1). Cierra los 36 CVEs corregibles —34 HIGH y 2 CRITICAL— que el escaneo de
  contenedor reportaba en `openssl`, `libxml2`, `musl` (`CVE-2026-40200`, ejecución arbitraria
  de código), `nghttp2` y `zlib`. Trivy pasa de 36 a 0 con los mismos flags del gate. El pin
  se queda en la línea `1.30` (stable) y no en `stable-alpine`, para recibir los parches
  `1.30.x` sin saltar de línea sola.

### Corregido
- **El healthcheck nunca ha dado verde.** `Dockerfile` y `docker-compose.yml` apuntaban a
  `http://localhost/`: el `/etc/hosts` de la imagen resuelve ese nombre también a `::1`, el
  `wget` de busybox intenta IPv6 antes que IPv4 y `nginx.conf` solo declara `listen 80`. Todos
  los chequeos devolvían `connection refused` —611 seguidos en el contenedor de producción—
  mientras el sitio respondía 200 con normalidad. Es decir: **cualquier** despliegue de esta
  imagen nacía `unhealthy`, y el `unhealthy` que se registró como hallazgo operativo el
  2026-07-29 no era una avería del host sino un defecto de este repositorio. Corregido a
  `127.0.0.1` en los dos sitios y verificado `healthy` en un contenedor construido con el
  arreglo. No se añade `listen [::]:80;` a `nginx.conf`: en un contenedor sin IPv6 esa
  directiva impide que nginx arranque, y cambiar un chequeo mal apuntado por un servicio que
  no levanta es un mal negocio.
- Corregida en consecuencia la afirmación de `gate-5-monitoring.md` y del A09 de
  `owasp-mapping.md` de que «el healthcheck existe y funciona, pero nadie está escuchando».
  Funcionaba no: la única señal automatizada del sistema llevaba en rojo permanente desde que
  el contenedor se creó, el 2026-07-14, y era además un falso positivo. Un monitor externo
  conectado entonces habría alertado de algo que no estaba pasando.
- `deployment.md`: el túnel del borde era un `<TODO>`; es **cloudflared en modo token**, y su
  *ingress* se administra en el panel de Cloudflare, no en el repositorio ni en el host. Queda
  anotado porque condiciona el redespliegue: recrear la landing con `docker compose` la mueve
  de red y de puerto, y si el origen del túnel está fijado a la IP del contenedor en la
  `bridge` por defecto, el sitio público cae con el contenedor sano.
- Registrada en `gate-4-deployment.md` la **deriva entre el compose y producción**: el
  contenedor que corre se creó el 2026-07-14 con `docker run` (sin etiquetas de compose,
  puerto 80 en vez de 8080, `ReadonlyRootfs: false`, `CapDrop: []`). El endurecimiento que la
  tabla de evidencias da por bueno está en el archivo y no en lo que sirve el sitio hoy.
- **Revisión de coherencia de la documentación.** Casi toda se escribió el 2026-07-29, antes de
  que el repositorio existiera en GitHub, y describía un mundo sin CI. Sincronizado con la
  realidad:
  - `gate-2`: el SAST constaba como «no ejecutado, no hay pipeline conectado» y los tres
    bloqueos declarados (Semgrep, Trivy, gitleaks) están hechos. El gate sigue abierto, pero
    **por otro motivo**: falta cobertura, que depende de que exista suite. El `Estado` de la
    cabecera no se toca: cerrarlo es decisión del owner.
  - `gate-4`: «SBOM generado — pendiente» era falso (se genera en cada run), y el ítem de los
    siete gates canónicos ahora detalla que van 5 de 7, con `license` y DAST ausentes.
  - `deployment.md`: decía que Semgrep y Trivy «dependen de que se conecte el repositorio a
    GitHub Actions», ya conectado. Y su diagrama promete `Merge bloqueado`, que **no ocurre**:
    ahora está marcado como intención y no como hecho.
  - `SECURITY.md`: «no contiene ni necesita secretos» dejó de ser cierto al añadir
    `GITLEAKS_LICENSE` como secreto de Actions. Distinguido código de CI, y registrada como
    brecha **alta** que los gates no bloqueen el merge.
  - `README.md`: «falta CI conectado» y «conectar el pipeline» eran obsoletos; «los 7 gates»
    era ambiguo porque hay **dos listas distintas de siete** —las G1–G7 del pipeline, todas en
    verde, y las siete canónicas de AI-DLC, con dos ausentes—. Desambiguado.
  - `repo-history.md`: su grafo describe un repo sin ramas ni merges, que ya no es este.
    Marcado como pendiente de regenerar cuando aterrice la pila de PR.
  - `CONTRIBUTING.md`: escribía `scripts/gitgraph_from_log.py` como si el script estuviera en
    el repositorio; vive en el skill de AI-DLC, como `validate_mermaid.py`.
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

### Decidido
- **Dominio confirmado: `higerotech.com`.** El owner lo cerró el 2026-07-30. Coincide con lo
  que ya estaba escrito en `canonical`, `hreflang`, Open Graph, JSON-LD, `robots.txt` y
  `sitemap.xml`, así que no hay contenido que cambiar; deja de figurar como supuesto en
  `charter.md`.
- **Pero confirmarlo no bastó: el apex no resuelve.** `higerotech.com` no tiene registro en DNS
  —la consulta devuelve solo SOA, con la zona en los NS de Cloudflare— ni regla en el ingress
  del túnel; forzando la IP de Cloudflare responde **HTTP 530**, y ninguno de los otros cuatro
  túneles del host lo sirve. El sitio vive en `www.higerotech.com`, `web.higerotech.com` y
  `demo.higerotech.com`. Consecuencia: `canonical`, los tres `hreflang`, `og:url`, las URLs del
  `sitemap.xml` y la línea `Sitemap:` de `robots.txt` apuntan a un host inexistente, y los tres
  hostnames son contenido duplicado sin un canonical válido que los consolide. Registrado como
  dependencia D1b en los requisitos y como fila 9 de «Lo que falta» en el gate 4.

### Pendiente de decisión humana
- Configurar `CONTACT.whatsapp` en `index.html`. Mientras esté vacío el botón de WhatsApp
  no se publica.
- Enrutar el apex `higerotech.com` (registro DNS + regla de ingress) **o** mover el canonical y
  las URLs absolutas a `www.higerotech.com`. Lo primero mantiene la marca; lo segundo se
  resuelve solo en el repositorio. Cualquiera de las dos, pero no dejarlo como está.
- Activar **HSTS** en Cloudflare. No puede emitirse desde nginx: emitir HSTS desde detrás de un
  terminador TLS que no se controla puede dejar el dominio inaccesible si la cadena se rompe.
- Proteger `main` en el servidor: la org está en plan Free y el repo es privado, y GitHub no
  ofrece branch protection ni rulesets en esa combinación. Salidas: subir a GitHub Team
  (mantiene el repo privado) o hacerlo público. Hasta entonces la única barrera es el hook.
- Arreglar `gitgraph_from_log.py` (vive en el skill de AI-DLC) y regenerar después
  `docs/03-implementation/repo-history.md`, cuyo grafo se quedó en `a0b767b`. Se intentó
  regenerarlo y la salida no es publicable: el `gitGraph` incluye solo la rama de la primera PR
  y omite las tres siguientes, la bitácora duplica commits no mergeados porque recorre refs
  remotas además de `main`, y los autores de los merges salen con mojibake. Publicar eso sería
  cambiar un documento desactualizado por uno incorrecto.

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
