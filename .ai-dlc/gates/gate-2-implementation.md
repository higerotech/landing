# Gate 2 — Implementación (cierre de Fase 03)

* **Estado:** review — **no superado**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 03-implementation
* **Versión:** 0.3.0

- [x] SAST sin findings críticos/altos — **ejecutado y limpio**: Semgrep (`p/security-audit`,
      `p/xss`) corre en cada PR y push a `main`, en verde. Ver el job `SAST` del pipeline.
- [x] Dependencias verificadas (SCA) — **N/A justificado**: cero dependencias de paquetes.
      El sistema no usa npm, pip ni ningún gestor; la única dependencia externa es la imagen
      base `nginx:1.30-alpine`. Ver A03 en `.ai-dlc/owasp-mapping.md`.
- [ ] Cobertura ≥ 80% branch — **no aplica hoy**: no existe suite de pruebas (ver Gate 3)
- [x] Dual review completado (humano + IA)
- [x] Sin secretos en el código — verificado **por herramienta**, ya no solo por lectura:
      gitleaks corre en cada PR. El historial completo se escaneó aparte con el binario
      (9 commits, sin hallazgos). `.gitignore` excluye `.env*`.

## Por qué este gate no está superado

**El motivo cambió.** Cuando se escribió este checklist el pipeline no existía como código
ejecutable; hoy sí: las siete comprobaciones G1–G7 corren y pasan. Los tres puntos que
constaban como bloqueo están hechos:

1. ~~Conectar un SAST que entienda HTML/JS~~ → Semgrep (`p/security-audit`, `p/xss`), en verde.
2. ~~Conectar Trivy sobre la imagen construida~~ → en verde, y la imagen base pasó a
   `nginx:1.30-alpine` para cerrar 36 CVEs corregibles.
3. ~~Añadir gitleaks al pipeline~~ → en verde, tras resolver la licencia de organización y los
   permisos de la API de PRs.

**Lo que queda abierto es un único ítem: cobertura ≥ 80 %,** que no puede cumplirse porque no
existe suite de pruebas. Es el mismo bloqueo que Gate 3, no uno independiente.

Dicho de otro modo: este gate ya no espera infraestructura, espera pruebas. Que eso baste o no
para cerrarlo es **decisión del owner**; el `Estado` de la cabecera se deja como estaba porque
cambiarlo sería tomar esa decisión desde la herramienta.

**Salvedad sobre el valor real de estos gates:** pasan, pero no son obligatorios. No hay branch
protection —org en plan Free con repo privado—, así que un pipeline en rojo no impide mergear.
Ver `CONTRIBUTING.md` §Al clonar.

## Evidencia disponible

| Ítem | Evidencia |
|---|---|
| Historial de implementación | `docs/03-implementation/repo-history.md` (derivado de `git log`) |
| Trazabilidad tag ↔ versión ↔ ADR | mismo documento, §Trazabilidad |
| Verificación funcional manual | `docs/05-deployment/deployment.md` §Verificación |
