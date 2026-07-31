# Gate 2 — Implementación (cierre de Fase 03)

* **Estado:** ✅ **superado**
* **Fecha:** 2026-07-29
* **Cierre:** 2026-07-30 — decisión del owner, tras medir la cobertura
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 03-implementation
* **Versión:** 0.4.0

- [x] SAST sin findings críticos/altos — **ejecutado y limpio**: Semgrep (`p/security-audit`,
      `p/xss`) corre en cada PR y push a `main`, en verde. Ver el job `SAST` del pipeline.
- [x] Dependencias verificadas (SCA) — **escaneadas de verdad desde el 2026-07-30**. Este ítem
      estaba marcado ✅ con la justificación «cero dependencias de paquetes», que dejó de ser
      cierta al introducir `jsdom` para las pruebas: hoy hay **46 paquetes de desarrollo**. El
      job `Dependencias (SCA)` ejecuta `npm audit --audit-level=high` en cada PR — 0
      vulnerabilidades. Matiz: ninguna viaja en la imagen (verificado; solo contiene los
      archivos del sitio), así que un hallazgo sería riesgo de la cadena de herramientas del CI.
      La imagen base `nginx:1.30-alpine` la cubre Trivy aparte.
- [x] Cobertura ≥ 80% — **100 % de funciones** (17/17) del script inline, 94,7 % de líneas
      (72/76, cota inferior). Medida con `tests/cobertura.mjs` y gateada en el CI con umbral
      100 sobre funciones. Ver más abajo por qué no vale la herramienta incorporada de Node.
- [x] Dual review completado (humano + IA)
- [x] Sin secretos en el código — verificado **por herramienta**, ya no solo por lectura:
      gitleaks corre en cada PR. El historial completo se escaneó aparte con el binario
      (9 commits, sin hallazgos). `.gitignore` excluye `.env*`.

## Cómo se cerró, y qué lo tuvo abierto

Se deja el recorrido escrito en vez de sustituirlo por un ✅: **el motivo de que este gate
estuviera abierto cambió tres veces**, y cada cambio fue un trabajo distinto. Un gate que pasa
de rojo a verde sin dejar rastro de qué lo bloqueaba no enseña nada la próxima vez.

1. **Faltaba infraestructura.** No había pipeline ejecutable.
2. **Faltaban pruebas.** El pipeline ya corría, pero no existía ninguna prueba automatizada.
3. **Faltaba medir.** Las pruebas existían pero nadie sabía qué cubrían — y la herramienta obvia
   daba un número falso en verde.

Los tres puntos que constaban como bloqueo en la fase 1 están hechos:

1. ~~Conectar un SAST que entienda HTML/JS~~ → Semgrep (`p/security-audit`, `p/xss`), en verde.
2. ~~Conectar Trivy sobre la imagen construida~~ → en verde, y la imagen base pasó a
   `nginx:1.30-alpine` para cerrar 36 CVEs corregibles.
3. ~~Añadir gitleaks al pipeline~~ → en verde, tras resolver la licencia de organización y los
   permisos de la API de PRs.

**El último ítem —cobertura ≥ 80 %— está medido y superado.** El 2026-07-30, con 48 pruebas:

| Métrica | Valor | Umbral que gatea |
|---|---|---|
| Funciones del script inline | **100,0 %** (17/17) | 100 %, en el CI |
| Líneas | 94,7 % (72/76) | — informativa, cota inferior |

**Ojo con cómo se llegó a ese número, porque la herramienta obvia falla en verde.**
`node --test --experimental-test-coverage` informaba **100 % de líneas midiendo solo el arnés**:
su reporter únicamente incluye rutas de archivo, y el JS del sitio vive en un `<script>` que
jsdom compila bajo la URL del documento. Cerrar este gate con esa cifra habría dejado
documentado un 100 % de cobertura sobre el conjunto vacío. Se mide con `tests/cobertura.mjs`,
que lee los datos crudos de V8 —que sí registran el script inline— y los traduce a líneas de
`index.html`. Detalle en `docs/04-testing/unit-tests.md` §Cobertura.

La medición encontró además **dos huecos reales**: nadie pulsaba los botones de idioma —todos
los tests llamaban a `setLang()` directamente, así que un botón desconectado habría pasado el
suite— y nadie ejercitaba el respaldo `addListener` para navegadores antiguos. Ambos cerrados.

**Cerrado el 2026-07-30 por decisión del owner**, con los cinco ítems cumplidos y con evidencia
ejecutable de cada uno, no por lectura ni por conveniencia.

## Qué NO significa este ✅

Tres salvedades que van con el cierre. Un gate cerrado sin sus límites escritos es un gate que
alguien citará mal dentro de seis meses.

1. **Los gates pasan, pero no bloquean.** No hay branch protection —org en plan Free con repo
   privado—, así que un pipeline en rojo no impide mergear. La única barrera es el hook local
   `pre-push`, que ni exige los gates ni alcanza los merges desde la web. Ver `CONTRIBUTING.md`
   §Al clonar. **Es la salvedad más importante de las tres.**
2. **La cobertura es del script inline, no del sitio.** 100 % de funciones significa que las 17
   funciones del `<script>` se ejecutan en alguna prueba. No dice nada del CSS, del marcado, del
   contraste ni del comportamiento en un navegador real: eso es Gate 3, que sigue abierto.
3. **Cerrar Gate 2 no adelanta a Gate 3.** Son fases distintas y este cierre no arrastra al
   siguiente. La pirámide de pruebas sigue teniendo un solo nivel.

## Evidencia disponible

| Ítem | Evidencia |
|---|---|
| Historial de implementación | `docs/03-implementation/repo-history.md` (derivado de `git log`) |
| Trazabilidad tag ↔ versión ↔ ADR | mismo documento, §Trazabilidad |
| Verificación funcional manual | `docs/05-deployment/deployment.md` §Verificación |
| SAST, secretos y SCA en verde | Jobs `SAST`, `Detección de secretos` y `Dependencias (SCA)` de `.github/workflows/security-gates.yml` |
| Suite unitaria y su diseño | `tests/unit/` (48 pruebas) y `docs/04-testing/unit-tests.md` |
| Cobertura medida y gateada | `npm run coverage` — `tests/cobertura.mjs`, umbral 100 % de funciones en el CI |
