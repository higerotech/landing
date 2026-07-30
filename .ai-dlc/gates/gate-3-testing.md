# Gate 3 — Pruebas (cierre de Fase 04)

* **Estado:** draft — **no superado**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.1.0

- [ ] Pirámide completa pasando (unit → integration → contract → e2e → security)
- [ ] Matriz OWASP Top 10 ejecutada
- [ ] DAST limpio
- [ ] Rendimiento dentro de SLOs
- [ ] Mutation testing ≥ 60%

## Estado real

**No hay ninguna prueba automatizada en el repositorio.** La fase 04 no se ha documentado
porque documentarla hoy sería describir algo que no existe.

Lo que sí se hizo, y consta como evidencia manual en
`docs/05-deployment/deployment.md` §Verificación:

- Cabeceras HTTP comprobadas con `curl -sI` en `/`, `/index.html`, `/assets/…`, `/robots.txt`,
  `/sitemap.xml` y una ruta inexistente.
- Código 404 real verificado en rutas inexistentes.
- Render, menú móvil, cambio de idioma y ausencia de errores de consola verificados en Chrome.
- Cambio de idioma repetido (4 ciclos) sin pérdida de nodos ni contenido.

Esto es verificación manual puntual, no una suite. No sustituye al gate.

## Pirámide propuesta para un sitio estático

Una landing no necesita la pirámide completa; lo que sí necesita es que nadie rompa en silencio
lo que ya se arregló. Propuesta mínima y proporcionada:

| Nivel | Herramienta sugerida | Qué protege |
|---|---|---|
| Unit | `node:test` + `jsdom` | Ocho unidades con ramas reales en `index.html:884-992`. **Diseñado** en `docs/04-testing/unit-tests.md` |
| Contract | `htmlhint` + `nginx -t` | HTML válido; configuración que arranca |
| E2E | Playwright | Menú móvil abre/cierra, i18n no pierde contenido, 404 responde 404 |
| Accesibilidad | `axe-core` vía Playwright | Contraste, `aria-*`, orden de encabezados |
| Seguridad | ZAP baseline | Cabeceras presentes, CSP efectiva |
| Rendimiento | Lighthouse CI | Presupuesto: LCP < 2,5 s en 3G lento |

Las tres pruebas E2E de la fila "E2E" corresponden exactamente a los tres bugs corregidos en
`7c7bc78`. Son las que evitan una regresión de lo ya pagado.

**Corrección del 2026-07-30.** La fila «Unit» decía «No aplica: no hay lógica de dominio», y era
falso. No hay lógica *de negocio*, que es otra cosa: el bloque `<script>` tiene cinco funciones
con ramas, dos decisiones con tabla de prioridad, tres degradaciones defensivas y una clase de
fallo que deja la página en blanco sin que el `<noscript>` la cubra. Todo eso es unitariamente
probable. El diseño completo —arnés, catálogo de ~30 casos, trazabilidad y coste— está en
`docs/04-testing/unit-tests.md`; el gate sigue **no superado** porque diseñar no es implementar.
