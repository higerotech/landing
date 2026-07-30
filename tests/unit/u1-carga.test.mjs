/* U1 · El script llega al final — P0
   Cubre la amenaza T17: el script no tiene aislamiento de errores y `.reveal`
   está en `opacity: 0`, así que una excepción antes de la línea 978 deja la
   página en blanco. Ver `docs/02-design/threat-model.md` §T17. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

describe('U1 · el script inline se ejecuta hasta el final', () => {
  test('U1.1 · cargar index.html no produce ninguna excepción', () => {
    const { errores } = cargarDOM()
    assert.deepEqual(
      errores.map(e => e.message ?? String(e)),
      [],
      'el script inline lanzó; con .reveal en opacity:0 eso deja la página en blanco'
    )
  })

  test('U1.2 · todos los .reveal reciben la clase in', () => {
    const { doc } = cargarDOM()
    const reveal = [...doc.querySelectorAll('.reveal')]

    assert.ok(reveal.length > 0, 'no hay elementos .reveal: el selector cambió')

    const sinIn = reveal.filter(el => !el.classList.contains('in'))
    assert.equal(
      sinIn.length, 0,
      `${sinIn.length} de ${reveal.length} elementos .reveal quedaron invisibles`
    )
  })

  test('U1.3 · la última sentencia del script se ejecutó', () => {
    // `setLang(idiomaInicial())` es la línea 991, la última. Si el idioma quedó
    // aplicado, nada de lo anterior lanzó. Es el canario de todo el bloque.
    const { doc } = cargarDOM()
    assert.equal(doc.documentElement.lang, 'es')
  })

  test('U1.4 · las funciones del script quedan accesibles en window', () => {
    // Si esto falla, el arnés dejó de funcionar y el resto de tests estaría
    // pasando en vacío.
    const { win } = cargarDOM()
    for (const fn of ['setLang', 'setMenu', 'syncToggleLabel', 'idiomaInicial']) {
      assert.equal(typeof win[fn], 'function', `window.${fn} no es una función`)
    }
  })

  test('U1.5 · el arnés detecta de verdad una excepción provocada', () => {
    /* Verifica el detector, no el sitio. Un suite en verde cuyo mecanismo de
       detección no funciona es peor que no tener suite, así que aquí se rompe
       un `id` a propósito y se exige que salte.

       De paso documenta T17 con un caso ejecutable: renombrar `nav-toggle`
       hace que la línea 919 lance, la 978 no llega a correr y los `.reveal` se
       quedan en `opacity: 0`. */
    const { errores, doc } = cargarDOM({
      sustituir: { de: 'id="nav-toggle"', a: 'id="nav-toggle-roto"' }
    })

    assert.ok(errores.length > 0, 'el arnés no detectó la excepción provocada')

    const reveal = [...doc.querySelectorAll('.reveal')]
    const conIn = reveal.filter(el => el.classList.contains('in'))
    assert.equal(
      conIn.length, 0,
      'la excepción no impidió el reveal: la cadena de fallo de T17 cambió'
    )
  })
})
