# ADR-0001: Adoptar la estructura AI-DLC en variante polyrepo

* **Estado:** accepted
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 1.0.0
* **ID:** ADR-0001
* **Supersede / Superseded-by:** —
* **Controles OWASP afectados:** A06

## Contexto

El estándar AI-DLC (`IA-DLC repos/AI-DLC/repository-structure.md`) define una topología de
referencia **monorepo híbrida**: artefactos de sistema en `docs/` y artefactos de servicio
co-localizados en `apps/<servicio>/docs/`.

Este repositorio contiene un único entregable: una página estática. No hay servicios, ni
librerías compartidas, ni IaC más allá del `Dockerfile` y `nginx.conf`. Clonar el
`project-template` completo traería `apps/worker-amqp/`, `packages/` e `infra/` vacíos o
irrelevantes, y un `docs/` con seis carpetas de las que cuatro no tendrían contenido real.

Hay una tensión de fondo: el repositorio no tenía control de versiones. Sin git, la fase 03
del estándar (cuyo `gitGraph` se **deriva** del historial real, no se escribe a mano) es
imposible de cumplir.

## Decisión

Adoptar la **variante polyrepo** que el propio estándar contempla en su sección final:

- `docs/00-project/`, `docs/01-requirements/` y `docs/02-design/` se mantienen, pero
  describen **un solo entregable**.
- `apps/` no se crea: el contenido del sitio vive en la raíz (`index.html`, `assets/`).
- `packages/` e `infra/` no se crean: no hay librerías compartidas ni IaC que escanear.
- `.ai-dlc/` se conserva íntegro (gates, plantillas, mapeo OWASP): es lo que hace auditable
  el proceso, y es independiente del tamaño del proyecto.
- Se inicializa git, con un primer commit de la línea base **anterior** a cualquier
  corrección, para que el historial refleje el punto de partida.

Solo se documentan las fases con sustancia real: 00, 01, 02, 03 y 05. Las fases 04 (testing)
y 06 (monitoring) se dejan **sin documento** y con su gate marcado como no superado, porque
hoy no existen ni pruebas ni observabilidad.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Polyrepo (elegida)** | Estructura proporcional al sistema; todo lo que existe está documentado | Se aparta de la topología de referencia | Ninguno |
| Monorepo completo desde el template | Fiel al estándar; listo si crecen los servicios | Carpetas vacías; el sitio pasaría a `apps/landing/` rompiendo rutas y despliegue | Estructura vacía invita a marcar gates por inercia |
| Documentar las seis fases igualmente | Apariencia de completitud | 04 y 06 serían aspiraciones redactadas como hechos | **Alto**: un gate marcado sin evidencia es peor que un gate abierto |
| Solo un README con diagramas | Mínimo esfuerzo | Sin gates ni trazabilidad; no es AI-DLC | Sin threat model no hay control trazable |

## Consecuencias

**Positivas**
- Cada documento del repositorio describe algo que existe y se puede verificar.
- Los gates no superados quedan visibles con la razón, no ocultos.
- Con git inicializado, `docs/03-implementation/repo-history.md` se deriva del historial real.

**Negativas / deuda asumida**
- Si Higerotech añade un segundo entregable (portal de clientes, API), habrá que migrar a
  monorepo: mover el sitio a `apps/landing/` y externalizar los artefactos transversales.
  El coste es moderado y se paga una sola vez.
- Los `README.md` por fase del template no se replican; el índice vive en el `README.md` raíz.

**Impacto en threat model**
- Ninguno directo. Indirectamente refuerza A06: la estructura obliga a que cada amenaza
  priorizada tenga control trazable antes de cerrar el Gate 1.
