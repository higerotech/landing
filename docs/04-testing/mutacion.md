# Mutation testing — Landing corporativa Higerotech

* **Estado:** **implementado** — 92,09 %, umbral en 90 (remedido el 2026-09-16)
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
| Mutantes | 177 — eran 144 hasta el 2026-09-16 |
| Muertos | **163** |
| Supervivientes | 14 |
| Score | **92,09 %** |
| Archivo mutado | `assets/sitio.js` — era `index.html` hasta **ADR-0007** (2026-09-16). El score no se movió: mismos 144 mutantes, mismos 133 muertos |
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

## Segunda ronda (2026-09-16): tres huecos más, y un gate que hizo su trabajo

Las páginas legales (ADR-0008) añadieron al script el modo de idioma fijo y el intercambio de
`href` por idioma. Con 33 mutantes nuevos, el score **cayó a 89,83 % y el gate falló** — es la
primera vez que rompe por código nuevo, y es exactamente para lo que está.

De los 18 supervivientes de esa ejecución, 11 eran los de siempre. Los otros siete eran del
código nuevo, y tres señalaban huecos de prueba reales:

| Hueco | Por qué pasaba inadvertido | Cerrado con |
|---|---|---|
| **Pulsar el idioma ya activo navegaba** | Cambiar `IDIOMA_FIJO && lang !== actual` por `true` —o el `&&` por `||`— hacía que pulsar ES estando ya en la versión castellana recargase la página sola. Ninguna prueba pulsaba el botón del idioma activo: todas probaban el cambio | **U13.11** |
| **El destino de los enlaces no cambiaba** | Vaciar el bucle de `data-href-*` dejaba los enlaces legales del pie apuntando al castellano con la etiqueta en inglés. U13.10 comprobaba que los atributos existan y que sus destinos existan, pero **nadie comprobaba que el `href` cambie** | **U13.12** |
| **La preferencia de idioma no se guardaba** | Anular la condición de persistencia dejaba de escribir en `localStorage`. Solo estaba probado el lado negativo —U13.5 exige que una página de idioma fijo NO pise la preferencia— y sin el positivo, «no persistir nunca» pasaba todas las pruebas | **U13.13** |

El tercero es el más instructivo, y repite el patrón de `idiomaInicial` de la primera ronda:
**probar solo una mitad de una condición deja la otra sin red**. Ahí fue la defensa en profundidad
la que enmascaraba el fallo; aquí, una aserción negativa sin su positiva.

Tras cerrarlos: **92,09 %**, 163 de 177 muertos, 14 supervivientes. El score baja tres centésimas
respecto al 92,36 % anterior porque el denominador creció más que los mutantes que se pudieron
matar; los tres supervivientes nuevos que quedan son de la misma familia estructural que los 11
de abajo —guardas `isConnected` y literales que el arnés no puede distinguir—.

## Los 11 supervivientes de la primera ronda: residuo estructural, no huecos

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

Varias pruebas afirman sobre el **texto del fuente** —que exista la regla `[hidden]`, que el
`@font-face` inlinado coincida con `fonts.css`, que el número sea solo dígitos—. Stryker reescribe
`assets/sitio.js` —`index.html` hasta ADR-0007, ver `stryker.config.json`— insertando sus
interruptores:

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

Con el techo estructural en torno al 92 %, un 60 % **no podría fallar nunca**: sería otro gate
decorativo, de los que este repositorio lleva semanas desmontando.

El 90 deja unos dos puntos de holgura. Y aquí se puede apretar más que en otros gates porque **la
medición es determinista**: el número de mutantes solo cambia cuando cambia el código, y el score
solo cuando cambian las pruebas. No hay ruido que absorber, al contrario que en el presupuesto de
rendimiento, donde el rango de 270 ms obligó a tomar medianas.

Verificado que rompe **dos veces**: con el umbral en 95 y un score de 92,36 salió con código 1, y
el 2026-09-16 rompió de verdad con un 89,83 % por código nuevo sin probar (ver §Segunda ronda).
Esa segunda vez es la que demuestra que el umbral está donde tiene que estar: con el 60 % de la
plantilla, tres huecos de prueba reales habrían entrado sin que nadie los mirara.
