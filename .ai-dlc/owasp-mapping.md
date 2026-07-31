# Mapeo OWASP Top 10:2025 → Controles del repo

Tabla viva. Cada requisito de seguridad de `docs/01-requirements/` referencia su fila aquí.

**Adaptación al alcance real.** Este repositorio publica un **sitio estático de una sola
página**: sin backend, sin base de datos, sin sesiones, sin formularios y sin datos de
usuario en el servidor. Buena parte del baseline AI-DLC (pensado para servicios con estado)
no aplica, y decir que "se cumple" sería falso. Cada riesgo está marcado como **Aplica**,
**Parcial** o **No aplica en este alcance**, con la razón. Cuando el sitio incorpore un
formulario de contacto o analítica, varios de estos pasan a **Aplica** y hay que revisar
el threat model.

## Resumen

| ID | Riesgo | Aplicabilidad | Fase / Gate | Verificación |
|---|---|---|---|---|
| A01 | Broken Access Control | No aplica | — | Todo el contenido es público por diseño |
| A02 | Security Misconfiguration | **Aplica — principal** | 05 / Gate 4 | Cabeceras + container scan + `nginx -t` |
| A03 | Software Supply Chain Failures | **Aplica** | 03 / Gate 2 | Imagen base pineada + SBOM + fuentes autoalojadas + Trivy anclado por SHA |
| A04 | Cryptographic Failures | Parcial | 05 / Gate 4 | TLS en el borde (fuera de esta imagen) |
| A05 | Injection | Parcial | 02 / Gate 1 | Sin entradas externas; sí hay sinks `innerHTML` |
| A06 | Insecure Design | **Aplica** | 02 / Gate 1 | Threat model STRIDE/DREAD |
| A07 | Identification & Auth Failures | No aplica | — | No hay autenticación |
| A08 | Software & Data Integrity Failures | **Aplica** | 05 / Gate 4 | Firma de imagen + SRI no requerido (todo same-origin) |
| A09 | Logging & Monitoring Failures | Parcial | 06 / Gate 5 | Solo logs de nginx; sin alertas (**brecha abierta**) |
| A10 | Mishandling of Exceptional Conditions | **Aplica** | 02 / Gate 1 | 404 real + degradación sin JS |

---

## A01 — Broken Access Control

**No aplica en este alcance.** No existen recursos protegidos, roles, ni identidad: el 100 %
del contenido servido es material de marketing público. No hay IDOR posible porque no hay
identificadores de objeto.

**Control residual aplicado:** `location ~ /\.` deniega el acceso a rutas ocultas (`.git`,
`.env`) por si alguna vez terminan dentro de la imagen, y `.dockerignore` las excluye del
contexto de build. Defensa en profundidad, no control de acceso.

**Reevaluar si:** se añade un área de clientes, descarga de documentos o panel de administración.

## A02 — Security Misconfiguration  *(riesgo principal de este proyecto)*

Para un sitio estático, la configuración **es** la superficie de ataque.

**Controles aplicados**

- Cabeceras de seguridad en `security-headers.conf`, **incluido en cada `location`**.
  `add_header` solo se hereda del nivel superior si el nivel actual no declara ninguna propia;
  como varios `location` añaden su `Cache-Control`, declararlas solo en `server` las perdía
  justo en la home. Ver ADR-0002.
- CSP restrictiva: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`.
- `server_tokens off` — sin versión de nginx en la cabecera `Server` ni en páginas de error.
- Imagen base mínima (`nginx:1.30-alpine`), rootfs de solo lectura, `cap_drop: ALL`,
  `no-new-privileges`, límites de CPU y memoria.
- `RUN nginx -t` en el build: una configuración inválida rompe el build, no el arranque.

**Verificación:** `curl -sI` sobre `/`, `/index.html`, `/assets/…`, ruta inexistente + Trivy
sobre la imagen.
**Evidencia:** `docs/05-deployment/deployment.md` §Verificación de cabeceras.

## A03 — Software Supply Chain Failures

**Controles aplicados**

- Sin gestor de paquetes: cero dependencias de npm/pip, por tanto cero riesgo de dependencia
  alucinada o typosquatting. Es una propiedad deliberada de la arquitectura (ADR-0003).
- Imagen base anclada a `nginx:1.30-alpine`.
- **Fuentes autoalojadas** (ADR-0004): antes el render dependía de `fonts.googleapis.com`;
  un compromiso o caída de ese CDN afectaba a la página. Ahora todo es same-origin.
- `aquasecurity/trivy-action` anclado por SHA de commit (`ed142fd`, v0.36.0). Antes usaba
  `@master`: el job que avala las imágenes desplegadas ejecutaba lo último de una rama móvil.
- SBOM CycloneDX generado en cada run y publicado como artefacto (`sbom.cdx.json`).

**Brechas abiertas**
- La imagen base se ancla por *tag*, no por *digest*: `nginx:1.30-alpine` puede cambiar bajo
  el mismo nombre. Pinear por `sha256` cuando se establezca cadencia de actualización.
- `gitleaks/gitleaks-action@v2` y `semgrep/semgrep-action@v1` siguen anclados por tag mayor,
  que el dueño del repo puede repuntar. Menos agudo que `@master`, pero es la misma clase de
  riesgo: anclarlos por SHA.
- El SBOM se genera pero **no se archiva por release**: el artefacto caduca con el run, así
  que no hay forma de reconstruir qué contenía una imagen ya desplegada (ver Gate 4).

**Verificación:** SCA/Trivy sobre la imagen en CI.

## A04 — Cryptographic Failures

**Parcial.** La imagen sirve HTTP en claro en el puerto 80; el TLS lo termina el proxy o el
túnel que está delante (fuera de este repositorio). La cabecera `upgrade-insecure-requests`
de la CSP está puesta, pero **HSTS no se emite aquí a propósito**: emitir HSTS desde detrás
de un terminador TLS que no controlamos puede dejar el dominio inaccesible si la cadena se
rompe. Debe configurarse en el borde.

No hay datos en reposo: el contenedor no escribe nada (`read_only: true`).

**Quién termina TLS: Cloudflare**, confirmado el 2026-07-30 (`docker inspect landing-tunnel` +
sus logs de configuración; detalle en `docs/05-deployment/deployment.md` §El borde). El tramo
entre el contenedor del túnel y nginx va en HTTP plano dentro del host, que es la amenaza T9
aceptada del threat model.

**HSTS activo desde el 2026-07-31**, emitido por Cloudflare como correspondía. Verificado con
`curl -sI` en `www`, `web` y `demo`, y en varias rutas incluida una que devuelve 404:

```
Strict-Transport-Security: max-age=2592000; includeSubDomains; preload
```

Sigue siendo correcto **no** emitirla desde nginx, por la razón del párrafo anterior.

**Acción pendiente, menor pero real: la directiva `preload` es hoy inerte y contradice al
`max-age`.** Para entrar en la lista de precarga de los navegadores, hstspreload.org exige
`max-age` ≥ **31 536 000 s (1 año)** y aquí hay **2 592 000 s (30 días)**. Además exige que el
**dominio base** sirva la cabecera y redirija HTTP→HTTPS, y el apex `higerotech.com` **no
resuelve** (responde 530). O sea: una eventual solicitud de precarga se rechazaría por dos
motivos independientes.

No es urgente —30 días de HSTS protegen igual a quien ya visitó el sitio— pero conviene
decidirlo a conciencia, porque **`preload` es prácticamente irreversible**: salir de la lista
tarda meses en llegar a los navegadores. Con `includeSubDomains` afectaría a `media.`,
`encuesta.`, `bots.` y a cualquier subdominio futuro. Las salidas son quitar `preload` hasta que
haga falta, o subir a un año **después** de enrutar el apex.

## A05 — Injection

**Parcial.** No hay entradas de usuario que lleguen al servidor: sin formularios, sin API,
sin base de datos. Los dos sinks que existen son de cliente:

| Sink | Origen del dato | Riesgo |
|---|---|---|
| `el.innerHTML = el.getAttribute('data-' + lang)` en `setLang()` | Atributos estáticos del propio documento | Bajo: el dato lo escribe el autor, no un tercero. Deja de serlo si algún día el contenido viene de una fuente externa. |
| `new URLSearchParams(location.search).get('lang')` | URL controlable por el visitante | Mitigado: se valida contra la allowlist `['es','en']` antes de usarse; nunca se interpola en el DOM. |

**Control:** allowlist estricta en el parámetro de idioma. La CSP actúa como segunda barrera.
**Verificación:** revisión de diseño (Gate 1) + prueba con `?lang=<script>`.

## A06 — Insecure Design

**Controles aplicados**

- Threat model STRIDE completo en `docs/02-design/threat-model.md`, con priorización DREAD.
- Escenarios de abuso documentados en el PRD desde Gate 0 (suplantación de marca, clickjacking,
  scraping de contacto).
- Degradación explícita: la página debe seguir siendo legible sin JS y sin webfonts. Esto es
  requisito de diseño, no accidente — coherente con lo que el propio sitio vende (Edge-First).

**Evidencia:** `docs/02-design/threat-model.md` + ADR-0002/0003/0004.

## A07 — Identification & Authentication Failures

**No aplica en este alcance.** No hay cuentas, sesiones, cookies ni tokens. El sitio no emite
ninguna cookie: no hay banner de consentimiento porque no hay nada que consentir, lo cual es
también la postura más limpia frente a GDPR.

**Reevaluar si:** se añade analítica, chat embebido o área privada.

## A08 — Software & Data Integrity Failures

**Controles aplicados**

- Todos los recursos son same-origin tras autoalojar las fuentes: no hay script ni hoja de
  estilo de terceros que pudiera ser sustituida en origen. Por eso **no se necesita SRI**.
- `nginx -t` en build garantiza que no se publica una configuración corrupta.

**Brecha abierta:** las imágenes no se firman ni se verifican en el despliegue.
`<TODO: cosign en Gate 4>`

## A09 — Security Logging & Monitoring Failures

**Brecha abierta — el gate 5 no se puede cerrar hoy.** Situación real:

- Existe: log de acceso y error de nginx a stdout, rotación vía driver json-file,
  healthcheck HTTP cada 30 s.
- No existe: agregación de logs, métricas, trazas, alertas, dashboard, ni SLIs/SLOs definidos.

Nadie se entera hoy si el sitio cae salvo que alguien lo visite. De hecho, durante la revisión
se observó el contenedor en producción marcado `unhealthy` sin que hubiera disparado ningún
aviso — evidencia concreta de esta brecha.

Al diagnosticarlo (2026-07-30) el healthcheck resultó estar roto por construcción: apuntaba a
`localhost`, que resuelve a `::1`, y nginx solo escucha en IPv4. Corregido a `127.0.0.1`. La
lección para esta brecha es más incómoda que la original: la única señal automatizada que
existía llevaba **dos semanas** en rojo permanente y su valor era cero, porque nadie la leía y
además era falsa. Ver `.ai-dlc/gates/gate-5-monitoring.md`.

**Verificación:** ninguna automatizada. **Gate 5: no superado.**

## A10 — Mishandling of Exceptional Conditions

**Controles aplicados**

- Ruta inexistente → **404 real** con página propia. Antes `try_files … /index.html` devolvía
  200 con la landing para cualquier URL (soft 404).
- Sin JS → el `<noscript>` restaura la visibilidad del contenido `.reveal`.
- Sin `IntersectionObserver` → rama de respaldo que revela todo.
- `localStorage` bloqueado (modo privado) → `try/catch`, la página sigue funcionando.
- Webfont no disponible → pila de respaldo a fuentes del sistema, nunca a serif.
- Número de WhatsApp sin configurar → el botón no se muestra, en lugar de publicar un CTA muerto.

**Hueco identificado el 2026-07-30 (amenaza T17).** La lista de arriba cubre condiciones
excepcionales *externas* al script —JS deshabilitado, observer ausente, `localStorage`
bloqueado, webfont caída—, pero no la condición excepcional del propio script: **que lance a
mitad**. Las líneas 919, 920, 972, 973 y 989 de `index.html` desreferencian nodos del DOM sin
guarda, y como `.reveal` está en `opacity: 0`, una excepción antes de la línea 978 deja la
página en blanco. La segunda viñeta de la lista —la rama de respaldo— **vive dentro del
script**, así que no protege contra esto: comparte destino con el fallo. Detalle en
`docs/02-design/threat-model.md` §T17.

**Verificación:** pruebas manuales documentadas en `docs/05-deployment/deployment.md`. Las
unitarias U1/U2 diseñadas en `docs/04-testing/unit-tests.md` cubrirían T17 cuando se
implementen.
**Evidencia:** salida de `curl` de la ruta inexistente devolviendo `404`.

---

## Resumen de brechas abiertas

| # | Brecha | OWASP | Gate bloqueado |
|---|---|---|---|
| 1 | Sin observabilidad ni alertas | A09 | Gate 5 |
| 2 | Sin SBOM ni firma de imagen | A03, A08 | Gate 4 |
| 3 | Imagen base por tag, no por digest | A03 | Gate 4 |
| 4 | HSTS y terminación TLS sin documentar | A04 | Gate 4 |
| 5 | Sin suite de pruebas automatizadas | — | Gate 3 |
