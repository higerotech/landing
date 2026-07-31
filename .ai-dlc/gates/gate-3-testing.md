# Gate 3 — Pruebas (cierre de Fase 04)

* **Estado:** review — **no superado**
* **Fecha:** 2026-07-29
* **Revisión:** 2026-07-31 — implementados el nivel unitario (50) y el E2E + accesibilidad (43)
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.3.0

- [ ] Pirámide completa pasando (unit → integration → contract → e2e → security) —
      **unit ✅ (50 pruebas, cobertura 100 %), contract ✅** (invariantes del HTML y cabeceras en
      cuatro rutas), **e2e ✅ (43 pruebas)**, **accesibilidad ✅ (axe-core)**. Falta el nivel de
      seguridad dinámica.
- [ ] Matriz OWASP Top 10 ejecutada — A05 con U3.5, y A02/A04 con E3.7 y E5. El resto sin
      prueba automatizada
- [ ] DAST limpio — sin herramienta asignada
- [ ] Rendimiento dentro de SLOs — sin Lighthouse CI
- [ ] Mutation testing ≥ 60% — descartado a propósito por ahora: añadiría otra dependencia
      grande y lo primero era que la suite existiera

## Estado real

**Hay dos niveles implementados**, ambos en el CI y ambos contra el artefacto real:

- **50 unitarias** (`npm test`, ~4 s) sobre el `index.html` real en jsdom. Diseño en
  `docs/04-testing/unit-tests.md`.
- **43 E2E + accesibilidad** (`npm run e2e`, ~15 s) con Playwright y axe-core **contra el
  contenedor**, no contra un servidor de ficheros. Diseño en `docs/04-testing/e2e-tests.md`.

Las E2E encontraron un bug en su primera ejecución: el atributo `hidden` del botón de WhatsApp
**no ocultaba nada**, porque no había regla `[hidden]` en la hoja y `.btn-secondary` fija
`display: inline-flex`. Con el número sin configurar el CTA muerto se publicaba igual. Es una
clase de defecto que jsdom no puede ver, y está registrada como corrección de T3 en el threat
model.

Qué cubren y qué no:

| Nivel | Estado |
|---|---|
| Unit + contrato del HTML | ✅ 50 pruebas, cobertura 100 %: paridad bilingüe (R2), contrato JS↔DOM, i18n, menú, RF05, reveal |
| E2E en navegador real | ✅ 43 pruebas: breakpoint real, sin JS, CSP aplicándose, 404, cero terceros |
| Accesibilidad (`axe-core`) | ✅ ES, EN, menú móvil abierto y página 404; sin violaciones `serious` ni `critical` |
| Rendimiento (Lighthouse) | ❌ |
| Seguridad dinámica (ZAP) | ❌ |
| Mutation testing | ❌ — descartado por ahora a propósito |

**El gate sigue abierto**, pero por tercera vez cambia el motivo. Ya no falta «todo lo que
necesita un navegador de verdad»: eso está. Lo que falta es **rendimiento, DAST y mutation
testing**. Son tres ítems concretos, no una categoría entera.

Lo que se hizo antes de que existiera la suite, y consta como evidencia manual en
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
| Unit | `node:test` + `jsdom` | Ocho unidades con ramas reales en `index.html:884-992`. **Implementado**: `docs/04-testing/unit-tests.md` |
| Contract | `htmlhint` + `nginx -t` | HTML válido; configuración que arranca |
| E2E | Playwright | **Implementado**, y con más alcance del previsto: además del menú, la i18n y el 404, cubre la página sin JS, la CSP aplicándose y la ausencia de terceros. Ver `docs/04-testing/e2e-tests.md` |
| Accesibilidad | `axe-core` vía Playwright | **Implementado**: ES, EN, menú abierto y 404 |
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
