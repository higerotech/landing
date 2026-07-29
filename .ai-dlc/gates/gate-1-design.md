# Gate 1 — Diseño (cierre de Fase 02)

* **Estado:** approved
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 02-design
* **Versión:** 0.2.0

- [x] Arquitectura C4 validada (`docs/02-design/architecture.md`)
- [x] Threat model STRIDE de sistema (`docs/02-design/threat-model.md`)
- [x] ADRs registrados para decisiones clave (ADR-0001 a ADR-0005)
- [x] Contratos de API definidos — **N/A justificado**: el sistema no expone API. En su
      lugar se documenta el contrato HTTP de rutas servidas (§Contratos en `architecture.md`).
- [x] Patrones de seguridad seleccionados por amenaza priorizada (DREAD)

## Evidencia

| Ítem | Diagrama | Ubicación |
|---|---|---|
| Contenedores y tecnología | `C4Container` | `docs/02-design/architecture.md` |
| Internos de la página | `C4Component` | `docs/02-design/architecture.md` |
| Flujo crítico (primera visita) | `sequenceDiagram` | `docs/02-design/architecture.md` |
| Ciclo de vida de la entidad núcleo | `stateDiagram-v2` | `docs/02-design/architecture.md` |
| Modelo de contenido | `erDiagram` + `classDiagram` | `docs/02-design/architecture.md` |
| Fronteras de confianza para STRIDE | `DFD` | `docs/02-design/threat-model.md` |
| Priorización | `quadrantChart` DREAD | `docs/02-design/threat-model.md` |

## Amenazas priorizadas y su control

Las seis amenazas con score DREAD ≥ 5 tienen control asignado y verificado. Ver la tabla
de trazabilidad en `docs/02-design/threat-model.md` §Controles.

**Riesgo aceptado explícitamente:** T4 (CSP con `'unsafe-inline'`). El CSS y el JS viven
dentro de `index.html` por decisión de arquitectura (ADR-0003). Se acepta hasta que se
extraigan a archivos propios, momento en el que la directiva puede endurecerse. Registrado
como deuda, no como cumplimiento.
