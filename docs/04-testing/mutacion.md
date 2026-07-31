# Mutation testing — Landing corporativa Higerotech

* **Estado:** **implementado** — 92,36 %, umbral en 90
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.1.0
* **Gate:** cierra el último checkbox del Gate 3
* **Herramienta:** Stryker + `@stryker-mutator/tap-runner`
* **Ejecución:** `npm run mutacion` — ~6,5 min. En CI, **semanal**, no por PR

## Qué mide, y por qué no es cobertura

La cobertura dice qué líneas se **ejecutan**. El mutation testing dice si las pruebas
**fallarían** cuando el código está mal: cambia `&&` por `||`, una condición por `true`, un
literal por `""`, y comprueba si alguna prueba se pone roja.

Este repositorio tenía 100 % de líneas y de funciones **y aun así** el primer análisis encontró
cinco huecos reales. Cobertura al 100 % y score de mutación al 88 % no es una contradicción: son
dos preguntas distintas.

## Resultado

| | |
|---|---|
| Mutantes | 144 |
| Muertos | **133** |
| Supervivientes | 11 |
| Score | **92,36 %** |
| Umbral que rompe | **90** |

## Lo que encontró: cinco huecos reales

Ninguno era teórico.

| Hueco | Por qué pasaba inadvertido |
|---|---|
| **Escape robaba el foco con el menú cerrado** | Convertir la condición del handler en `true` hacía que `navToggle.focus()` corriera con cada tecla. `aria-expanded` ya era `'false'`, así que la aserción existente no notaba nada. Cerrado ampliando U7.5 |
| **Cualquier tecla cerraba el menú** | Sustituir `e.key === 'Escape'` por `true` no lo detectaba nadie: escribir en la página habría cerrado el panel. Cerrado con **U7.8** |
| **El handler de breakpoint cerraba siempre** | Solo se probaba `matches: true`, así que un handler que ignorara la condición daba el mismo resultado. Cerrado con **U7.9** |
| **`idiomaInicial` devolvía un idioma inválido** | Es el más interesante: quitar la validación **no se notaba porque `setLang` valida otra vez** y cae a `'es'`. El DOM acababa igual. La defensa en profundidad enmascaraba el fallo. Cerrado con **U4.8**, que interroga a la función directamente |

El score subió de **88,19 % a 92,36 %**.

## Los 11 supervivientes: residuo estructural, no huecos

Ninguno es una prueba que falte. Se dejan documentados para que nadie los persiga en balde:

| Cuántos | Cuáles | Por qué sobreviven |
|---|---|---|
| 4 | Guardas y atributos de `initWhatsApp` | Los cubren U8.1 y U8.2, **saltadas bajo instrumentación** (ver abajo). En navegador real los matan E6.1 y E6.2 |
| 4 | La consulta `'(min-width: 981px)'`, el evento `'change'` y las dos ramas de `addEventListener`/`addListener` | El stub de `matchMedia` del arnés ignora la consulta y el nombre del evento: **es imposible matarlos desde jsdom**. En navegador real los matan E1.1 y E1.2, que prueban el umbral de verdad |
| 3 | `let currentLang = 'es'`, la guarda `!el.isConnected`, y el `'es'` del handler de `#btn-es` | **Equivalentes**: sin diferencia observable. `currentLang` lo sobrescribe `setLang` al cargar; la guarda es inalcanzable porque no hay pares anidados —justo lo que afirma U3.6—; y `setLang("")` cae a `'es'` igual |

Dos de esos equivalentes **confirman de forma independiente** lo que el código ya decía en sus
comentarios: que `currentLang` es solo un valor inicial y que la guarda `isConnected` es
precautoria. Es un uso poco citado del mutation testing — verificar que un comentario no miente.

## Tres obstáculos que hubo que resolver

Los tres primeros intentos dieron **0,00 %**, que no era un score sino un artefacto. Cada causa
era distinta y ninguna se adivinaba desde el mensaje de error:

1. **Node 24 emite `spec`, no TAP.** El `tap-runner` parseaba una salida que no entendía y veía
   cero pruebas. → `--test-reporter=tap`.
2. **El script corre dentro de jsdom, en otro *realm*.** La cabecera que Stryker inyecta hace
   `g.__stryker__ || (g.__stryker__ = {})` y lee `g.process.env.__STRYKER_ACTIVE_MUTANT__`; pero
   ahí `globalThis` es la ventana y `process` no existe. Ningún mutante llegaba a activarse y la
   cobertura nunca volvía a Node. → puente en `cargar-dom.mjs` que comparte **el mismo objeto**
   `__stryker__` entre Node y la ventana.
3. **`node --test` usa un proceso hijo por archivo**, así que el global del hijo no llegaba al
   padre. → `--experimental-test-isolation=none`.

### Las pruebas que se saltan bajo instrumentación

Seis pruebas afirman sobre el **texto del fuente** —que exista la regla `[hidden]`, que el
`@font-face` inlinado coincida con `fonts.css`, que el número sea solo dígitos—. Stryker reescribe
`index.html` insertando sus interruptores:

```js
whatsapp: stryMutAct_9fa48("1") ? "" : (stryCov_9fa48("1"), '13235543854')
```

Así que dejan de encontrar lo que buscan, **y hacen bien**: bajo instrumentación el fuente ya no
es el que se publica. Se saltan en ese contexto, no se relajan. En ejecución normal no se salta
ninguna. La detección es por la huella `stryMutAct_` y no por una variable de entorno de Stryker,
para que siga funcionando si cambian sus internos.

## Por qué semanal y no por PR

| | |
|---|---|
| Duración | ~6 min 34 s |
| Pipeline de PR actual | ~7 min |

Meterlo en cada PR lo **dobla**. Sobre ~100 líneas de lógica que cambian poco, el grueso del
valor ya se cobró en la primera medición. Semanal captura una regresión en días en vez de
minutos, a coste casi nulo por PR.

**Riesgo asumido, dicho en voz alta:** una regresión puede vivir hasta siete días sin que nadie
la vea. Se acepta porque el nivel unitario y el E2E sí son obligatorios en cada PR, y esos son
los que protegen el comportamiento; esto protege la **calidad de esas pruebas**, que se degrada
más despacio.

**Y una trampa de GitHub:** los workflows programados se **desactivan solos** en repositorios sin
actividad durante 60 días, sin avisar. Por eso el workflow también acepta `workflow_dispatch`.

## Por qué el umbral es 90 y no el 60 de la plantilla

Con el techo estructural en 92,36 %, un 60 % **no podría fallar nunca**: sería otro gate
decorativo, de los que este repositorio lleva semanas desmontando.

El 90 deja dos puntos de holgura. Y aquí se puede apretar más que en otros gates porque **la
medición es determinista**: las dos ejecuciones dieron exactamente 144 mutantes y el score solo
se movió al cambiar las pruebas. No hay ruido que absorber, al contrario que en el presupuesto de
rendimiento, donde el rango de 270 ms obligó a tomar medianas.

Verificado que rompe: con el umbral en 95 y un score de 92,36, sale con código 1.
