# Gate 4 — Despliegue (cierre de Fase 05)

* **Estado:** review — **parcial**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 05-deployment
* **Versión:** 0.3.0

- [ ] Pipeline con 7 gates limpio (SAST, SCA, secrets, license, container, IaC, DAST)
- [x] IaC escaneada sin findings críticos — **N/A parcial**: no hay Terraform ni Kubernetes.
      La "infraestructura como código" se reduce a `Dockerfile`, `docker-compose.yml`,
      `nginx.conf` y `security-headers.conf`, que sí están versionados y revisados.
      `RUN nginx -t` valida la configuración en tiempo de build.
- [x] Runbook de rollback documentado con disparadores (`docs/05-deployment/deployment.md`)
- [ ] SBOM generado — **pendiente**

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
| 1 | Pipeline real | Sustituir los `TODO` de `.github/workflows/security-gates.yml` |
| 2 | SBOM | `trivy image --format cyclonedx` archivado por release |
| 3 | Imagen por digest | Cambiar `nginx:1.27-alpine` por `nginx:1.27-alpine@sha256:…` |
| 4 | Firma de imagen | `cosign sign` + verificación antes de desplegar |
| 5 | Terminación TLS y HSTS documentadas | `<TODO: confirmar quién termina TLS>` |

## Hallazgo operativo abierto

Durante la revisión del 2026-07-29 se observó el contenedor `higerotech-landing` en el host
**Up 24 hours (unhealthy)**, publicando en el puerto 80 junto a un `landing-tunnel`. El
healthcheck llevaba fallando sin que nadie se enterara: no hay alerta conectada (ver A09 en
`.ai-dlc/owasp-mapping.md`). Ese contenedor sirve la versión **anterior** a las correcciones
de `7c7bc78`.

Queda pendiente de decisión humana: diagnosticar el `unhealthy` y decidir el redespliegue.
