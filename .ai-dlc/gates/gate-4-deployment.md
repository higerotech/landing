# Gate 4 — Despliegue (cierre de Fase 05)

* **Estado:** review — **parcial**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 05-deployment
* **Versión:** 0.3.0

- [ ] Pipeline con 7 gates limpio (SAST, SCA, secrets, license, container, IaC, DAST) —
      **5 de 7 resueltos**: SAST ✅ Semgrep, secrets ✅ gitleaks, container ✅ Trivy,
      SCA ✅ N/A (cero dependencias de paquetes), IaC ✅ N/A parcial (ver ítem siguiente).
      Faltan **license** (sin escaneo de licencias) y **DAST** (sin ZAP ni equivalente).
      No confundir esta lista canónica con las siete comprobaciones G1–G7 de
      `docs/05-deployment/deployment.md`, que son otro conjunto y sí están las siete en verde.
- [x] IaC escaneada sin findings críticos — **N/A parcial**: no hay Terraform ni Kubernetes.
      La "infraestructura como código" se reduce a `Dockerfile`, `docker-compose.yml`,
      `nginx.conf` y `security-headers.conf`, que sí están versionados y revisados.
      `RUN nginx -t` valida la configuración en tiempo de build.
- [x] Runbook de rollback documentado con disparadores (`docs/05-deployment/deployment.md`)
- [x] SBOM generado — **sí, en cada run**: Trivy emite `sbom.cdx.json` (CycloneDX) y se sube
      como artefacto. **Pero no se archiva por release:** el artefacto caduca con el run, así
      que hoy no se puede reconstruir qué contenía una imagen ya desplegada. Generado ≠
      conservado; ver la fila 2 de «Lo que falta».

## Lo que sí está cerrado

| Control | Estado | Evidencia |
|---|---|---|
| Configuración validada en build | ✅ | `RUN nginx -t` en `Dockerfile` |
| Cabeceras de seguridad en todas las rutas | ✅ | `curl -sI` — `docs/05-deployment/deployment.md` |
| Contenedor endurecido | ✅ | `read_only`, `cap_drop: ALL`, `no-new-privileges` en compose |
| Límites de recursos | ✅ | 0,5 CPU / 128 MB |
| Runbook de rollback con disparadores | ✅ | `docs/05-deployment/deployment.md` §Rollback |
| Plan de cutover | ✅ | `gantt` en `docs/05-deployment/deployment.md` |

## Lo que falta

| # | Falta | Acción |
|---|---|---|
| 1 | ~~Pipeline real~~ | **Hecho.** Solo queda en `TODO` el bloque de Gate 3 (Playwright, axe-core, Lighthouse), que depende de que exista la suite |
| 2 | Archivar el SBOM | Se genera en cada run pero caduca con el artefacto: publicarlo por release para poder auditar una imagen desplegada |
| 3 | Imagen por digest | Cambiar `nginx:1.30-alpine` por `nginx:1.30-alpine@sha256:…` |
| 4 | Firma de imagen | `cosign sign` + verificación antes de desplegar |
| 5 | Terminación TLS y HSTS documentadas | `<TODO: confirmar quién termina TLS>` |
| 6 | Escaneo de licencias | El gate canónico `license` no tiene herramienta asignada |
| 7 | DAST | Sin ZAP baseline ni equivalente; propuesto en `gate-3-testing.md` |
| 8 | Obligatoriedad del pipeline | Los gates pasan pero **no bloquean**: sin branch protection (org Free + repo privado), un rojo no impide mergear |

## Hallazgo operativo — diagnosticado, redespliegue pendiente

Durante la revisión del 2026-07-29 se observó el contenedor `higerotech-landing` en el host
**Up 24 hours (unhealthy)**, publicando en el puerto 80 junto a un `landing-tunnel`. El
healthcheck llevaba fallando sin que nadie se enterara: no hay alerta conectada (ver A09 en
`.ai-dlc/owasp-mapping.md`). Ese contenedor sirve la versión **anterior** a las correcciones
de `7c7bc78`.

**Causa, diagnosticada el 2026-07-30:** un defecto del propio repositorio, no una avería del
host. El healthcheck apuntaba a `http://localhost/`; el `/etc/hosts` de la imagen resuelve
ese nombre también a `::1`, el `wget` de busybox intenta IPv6 antes que IPv4 y `nginx.conf`
solo declara `listen 80`. Resultado: `connection refused` en todos los chequeos —611
consecutivos en el contenedor observado— mientras el sitio respondía 200 con normalidad.
Estaba duplicado en `Dockerfile` y `docker-compose.yml`, así que **cualquier** despliegue de
esta imagen nacía `unhealthy`. Corregido a `127.0.0.1` en ambos; verificado `healthy` en un
contenedor construido con el arreglo.

No se añadió `listen [::]:80;` a `nginx.conf` a propósito: en un contenedor sin IPv6 esa
directiva impide arrancar nginx, que es peor que un healthcheck mal apuntado.

**Deriva de configuración detectada de paso:** el contenedor en producción se creó el
2026-07-14 con `docker run`, no con este `docker-compose.yml` (no tiene etiquetas de compose,
publica en el puerto 80 y no en 8080, y `docker inspect` devuelve `ReadonlyRootfs: false` y
`CapDrop: []`). El endurecimiento de la fila «Contenedor endurecido» de la tabla anterior
está en el compose y **no** en lo que corre hoy. La evidencia de esa fila es el archivo, no
producción.

Queda pendiente: redesplegar con `docker compose` —lo que aplica a la vez el arreglo, el
endurecimiento y las correcciones de `7c7bc78`— comprobando antes a qué origen apunta el
`landing-tunnel`, porque el túnel es de tipo token y su ingress se administra en el panel de
Cloudflare, no en este repositorio. Cambiar de red o de puerto sin saberlo tumba el sitio
público.
