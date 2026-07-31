# Gate 3 — Pruebas (cierre de Fase 04)

* **Estado:** review — **no superado**
* **Fecha:** 2026-07-29
* **Revisión:** 2026-07-31 — implementados el unitario (51), el E2E + accesibilidad (51) y el presupuesto de rendimiento, el DAST y el mutation testing
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.7.0

- [ ] Pirámide completa pasando (unit → integration → contract → e2e → security) —
      **unit ✅ (50 pruebas, cobertura 100 %), contract ✅** (invariantes del HTML y cabeceras en
      cuatro rutas), **e2e ✅ (51 pruebas)**, **accesibilidad ✅ (axe-core)**. Falta el nivel de
      seguridad dinámica.
- [x] Matriz OWASP Top 10 ejecutada — **nueve de diez categorías con prueba automatizada**, con
      la trazabilidad categoría → prueba en `.ai-dlc/owasp-mapping.md` §Matriz de verificación.
      La única sin cobertura es **A09**, que es la brecha abierta del Gate 5: no hay
      observabilidad que verificar. Incluye pruebas de la **premisa** de A01 y A07, marcadas «No
      aplica» sobre la base de que no hay autenticación ni entradas de usuario — una premisa que
      hasta ahora nadie vigilaba
- [x] DAST limpio — **ZAP baseline**: 0 fallos, 0 avisos nuevos, 64 reglas en verde y
      3 hallazgos aceptados con su motivo en `.zap/rules.tsv`. Ver `docs/04-testing/dast.md`
- [x] Rendimiento dentro de SLOs — **LCP 1 933 ms** (mediana) contra un presupuesto de 2 500
      en **3G lento real**, y 104 KB contra 350. Gateado en el CI. Ver
      `docs/04-testing/rendimiento.md`
- [x] Mutation testing ≥ 60% — **92,36 %** (133 de 144 mutantes muertos), muy por encima del
      60 % de la plantilla. Umbral propio en **90**, porque con el techo estructural en 92,36 un
      60 % no podría fallar nunca. Corre **semanal**, no por PR: tarda 6,5 min y doblaría el
      pipeline. Encontró **cinco huecos reales** que se cerraron. Ver `docs/04-testing/mutacion.md`

## Estado real

**Hay dos niveles implementados**, ambos en el CI y ambos contra el artefacto real:

- **50 unitarias** (`npm test`, ~4 s) sobre el `index.html` real en jsdom. Diseño en
  `docs/04-testing/unit-tests.md`.
- **51 E2E + accesibilidad** (`npm run e2e`, ~15 s) con Playwright y axe-core **contra el
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
| E2E en navegador real | ✅ 51 pruebas: breakpoint real, sin JS, CSP aplicándose, 404, cero terceros |
| Accesibilidad | ✅ axe con **todas las reglas** —incluidas buenas prácticas— y umbral en `moderate`, en ES, EN, menú abierto y 404. Más ocho comprobaciones que axe no hace: skip link, landmarks, foco visible, sin trampa de foco, reflow a 320px, zoom 200 %, `reduced-motion` y el contraste que axe dejaba en «incompleto» |
| Rendimiento (Lighthouse) | ✅ LCP 1 933 ms y 104 KB en 3G lento, mediana de 3 ejecuciones, gateado |
| Seguridad dinámica (ZAP) | ✅ baseline pasivo: 0 fallos, 3 aceptados y documentados, gateado |
| Mutation testing | ✅ 92,36 %, umbral 90, ejecución semanal |

**Todos los checkboxes están cumplidos.** El último —mutation testing— se cerró el 2026-07-31, y
merece una nota: se había descartado con el argumento de que «lo primero era que existiera algo
que mutar». Ese motivo caducó en cuanto hubo suite, y al revisarlo también resultó falso el
bloqueo técnico que se suponía: **Stryker sí puede mutar JavaScript incrustado en un HTML**.
Costó tres obstáculos reales —el formato de salida de `node --test`, el aislamiento de realms de
jsdom y el proceso hijo por archivo—, todos resueltos.

Y valió la pena: con 100 % de cobertura de líneas y funciones, encontró **cinco huecos reales**
donde las pruebas no habrían detectado el fallo.

El recorrido merece leerse entero, porque el motivo del bloqueo nunca fue el mismo dos veces:

> faltaba pipeline → faltaban pruebas → faltaba medir la cobertura → faltaba todo lo que
> necesita un navegador → faltaba el rendimiento → faltaba la seguridad dinámica

**Cerrar el gate es decisión del owner.** El `Estado` de la cabecera se deja como estaba porque
cambiarlo sería tomarla desde la herramienta — el mismo criterio que se aplicó al Gate 2.

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
| Seguridad | ZAP baseline | **Implementado**: `docs/04-testing/dast.md`. Por Docker y no por acción de GitHub, para poder ejecutarlo igual en local |
| Rendimiento | Lighthouse | **Implementado**: `docs/04-testing/rendimiento.md`. Con throttling real y mediana de 3 ejecuciones, porque el simulado daba 5,26 s donde el navegador mide 1,6 |

Las tres pruebas E2E de la fila "E2E" corresponden exactamente a los tres bugs corregidos en
`7c7bc78`. Son las que evitan una regresión de lo ya pagado.

**Corrección del 2026-07-30.** La fila «Unit» decía «No aplica: no hay lógica de dominio», y era
falso. No hay lógica *de negocio*, que es otra cosa: el bloque `<script>` tiene cinco funciones
con ramas, dos decisiones con tabla de prioridad, tres degradaciones defensivas y una clase de
fallo que deja la página en blanco sin que el `<noscript>` la cubra. Todo eso es unitariamente
probable. El diseño completo —arnés, catálogo de ~30 casos, trazabilidad y coste— está en
`docs/04-testing/unit-tests.md`; el gate sigue **no superado** porque diseñar no es implementar.
