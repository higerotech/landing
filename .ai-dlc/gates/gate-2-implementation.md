# Gate 2 — Implementación (cierre de Fase 03)

* **Estado:** review — **no superado**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 03-implementation
* **Versión:** 0.3.0

- [ ] SAST sin findings críticos/altos — **no ejecutado**: no hay pipeline conectado todavía
- [x] Dependencias verificadas (SCA) — **N/A justificado**: cero dependencias de paquetes.
      El sistema no usa npm, pip ni ningún gestor; la única dependencia externa es la imagen
      base `nginx:1.30-alpine`. Ver A03 en `.ai-dlc/owasp-mapping.md`.
- [ ] Cobertura ≥ 80% branch — **no aplica hoy**: no existe suite de pruebas (ver Gate 3)
- [x] Dual review completado (humano + IA)
- [x] Sin secretos en el código — verificado: el repositorio no contiene credenciales,
      tokens ni claves. `.gitignore` excluye `.env*`.

## Por qué este gate no está superado

Dos ítems dependen de infraestructura de CI que aún no existe. El workflow
`.github/workflows/security-gates.yml` está creado pero con los pasos en `TODO`: define la
forma, no ejecuta herramientas reales todavía.

**Para cerrarlo hacen falta:**
1. Conectar un SAST que entienda HTML/JS (Semgrep con reglas de `javascript.browser`).
2. Conectar Trivy sobre la imagen construida.
3. Añadir gitleaks al pipeline.

Nada de esto bloquea el despliegue del sitio actual, pero el gate se queda abierto de forma
honesta en vez de marcarse por conveniencia.

## Evidencia disponible

| Ítem | Evidencia |
|---|---|
| Historial de implementación | `docs/03-implementation/repo-history.md` (derivado de `git log`) |
| Trazabilidad tag ↔ versión ↔ ADR | mismo documento, §Trazabilidad |
| Verificación funcional manual | `docs/05-deployment/deployment.md` §Verificación |
