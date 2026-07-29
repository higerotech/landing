# Gate 0 — Requisitos (cierre de Fase 01)

* **Estado:** approved
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 01-requirements
* **Versión:** 0.1.0

No avanzar a diseño hasta cumplir TODO:

- [x] Requisitos funcionales documentados en `docs/01-requirements/landing-corporativa.md`
- [x] Requisitos de seguridad mapeados a OWASP ASVS (RS01–RS07, nivel L1)
- [x] Escenarios **negativos / de abuso** definidos (EA01–EA05)
- [x] Threat assessment inicial realizado (DFD + quadrantChart DREAD en el PRD)
- [x] Datos clasificados (`docs/00-project/data-classification.md`)
- [x] Charter y glosario aprobados (`docs/00-project/`)

## Evidencia

| Ítem | Diagrama que lo respalda | Ubicación |
|---|---|---|
| Alcance acordado | `mindmap` | `docs/00-project/charter.md` |
| Experiencia y puntos de fricción | `journey` | `docs/01-requirements/landing-corporativa.md` |
| Requisitos ↔ ASVS ↔ verificación | `requirementDiagram` | `docs/01-requirements/landing-corporativa.md` |
| Superficie y fronteras de confianza | `DFD` | `docs/01-requirements/landing-corporativa.md` |
| Priorización de amenazas | `quadrantChart` DREAD | `docs/01-requirements/landing-corporativa.md` |
| Sistema y actores externos | `C4Context` | `docs/01-requirements/landing-corporativa.md` |

## Nota de alcance

El nivel ASVS objetivo es **L1**, no L2. Justificación: el sistema no procesa ni almacena
datos de usuario, no tiene autenticación y no maneja transacciones. Elevar a L2 exigiría
controles (gestión de sesión, criptografía de datos en reposo) que no tienen objeto aquí.
Si se añade un formulario de contacto, el nivel objetivo sube a L2 y este gate se reabre.
