/* U7 · Menú móvil y su cableado — P4
   Corresponde a los bugs corregidos en `7c7bc78`: antes de esa corrección las
   cuatro secciones eran inalcanzables desde el móvil. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

const abierto = doc =>
  doc.getElementById('nav-links').classList.contains('open') &&
  doc.getElementById('nav-toggle').getAttribute('aria-expanded') === 'true'

describe('U7 · menú móvil', () => {
  test('U7.1 · el toggle abre y el segundo click cierra', () => {
    const { doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    assert.equal(abierto(doc), false, 'debe arrancar cerrado')

    toggle.click()
    assert.equal(abierto(doc), true)

    toggle.click()
    assert.equal(abierto(doc), false)
  })

  test('U7.2 · pulsar un enlace del menú lo cierra', () => {
    const { doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')
    const enlace = doc.querySelector('#nav-links a')

    toggle.click()
    assert.equal(abierto(doc), true)

    enlace.click()
    assert.equal(abierto(doc), false, 'navegar a una sección debe cerrar el panel')
  })

  test('U7.3 · pulsar el panel fuera de un enlace no lo cierra', () => {
    const { doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')
    const panel = doc.getElementById('nav-links')

    toggle.click()
    panel.click()

    assert.equal(abierto(doc), true, 'solo los enlaces cierran el menú')
  })

  test('U7.4 · Escape cierra y devuelve el foco al toggle', () => {
    const { win, doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    toggle.click()
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    assert.equal(abierto(doc), false)
    assert.equal(doc.activeElement, toggle, 'el foco no debe perderse al cerrar con teclado')
  })

  test('U7.5 · Escape con el menú cerrado no altera el estado ni roba el foco', () => {
    /* La aserción sobre el foco la pidió el mutation testing: convertir la
       condición del handler en `true` hacía que Escape llamara a
       `navToggle.focus()` con el menú ya cerrado, y `aria-expanded` no cambiaba
       —ya era 'false'—, así que la versión anterior de esta prueba pasaba.
       Robarle el foco a quien está tecleando en otra parte de la página sí es
       un defecto observable. */
    const { win, doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')
    const antes = toggle.getAttribute('aria-expanded')
    const focoAntes = doc.activeElement

    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    assert.equal(toggle.getAttribute('aria-expanded'), antes)
    assert.equal(doc.activeElement, focoAntes, 'Escape con el menú cerrado no debe mover el foco')
  })

  test('U7.8 · otra tecla con el menú abierto no lo cierra', () => {
    /* Cierra el mutante que sustituye `e.key === 'Escape'` por `true`: sin esta
       prueba, un handler que reaccionara a CUALQUIER tecla pasaba inadvertido, y
       escribir en la página cerraría el menú. */
    const { win, doc } = cargarDOM()
    doc.getElementById('nav-toggle').click()
    assert.equal(abierto(doc), true)

    for (const key of ['a', 'Enter', 'ArrowDown', 'Shift']) {
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }))
      assert.equal(abierto(doc), true, `la tecla ${key} no debe cerrar el menú`)
    }
  })

  test('U7.9 · salir del ancho de escritorio no toca el panel', () => {
    /* Cierra el mutante que sustituye `e.matches` por `true`: el handler solo
       debe cerrar cuando se ENTRA en escritorio. Antes solo se probaba el caso
       verdadero, así que un handler que cerrara siempre pasaba igual. */
    const { doc, mediaQueries } = cargarDOM()
    doc.getElementById('nav-toggle').click()
    assert.equal(abierto(doc), true)

    mediaQueries[0].simularCambio(false)

    assert.equal(abierto(doc), true, 'con matches:false el menú debe seguir abierto')
  })

  test('U7.6 · volver a ancho de escritorio cierra el panel', () => {
    /* Verifica el CABLEADO, no el breakpoint: que el umbral correcto sea 981px
       solo lo puede afirmar un navegador real midiendo, y eso es E2E. */
    const { doc, mediaQueries } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    toggle.click()
    assert.equal(abierto(doc), true)

    assert.equal(mediaQueries.length, 1, 'el script debe registrar una media query')
    mediaQueries[0].simularCambio(true)

    assert.equal(abierto(doc), false, 'al volver a escritorio el panel no debe quedar abierto')
  })

  test('U7.7 · con un matchMedia antiguo usa addListener', () => {
    /* Hueco que encontró el medidor de cobertura: la línea 931 —el respaldo
       `else if (mqEscritorio.addListener)` para navegadores sin la API de
       eventos— no la ejecutaba ningún test, porque el stub del arnés ofrece
       siempre `addEventListener`. Aquí se le da uno que solo tiene la antigua. */
    const antiguos = []

    const { doc } = cargarDOM({
      alPreparar (win) {
        win.matchMedia = consulta => {
          const mq = {
            media: consulta,
            matches: false,
            addListener (fn) { this._fn = fn },
            removeListener () {}
          }
          antiguos.push(mq)
          return mq
        }
      }
    })

    assert.equal(antiguos.length, 1, 'el script debe caer al camino antiguo')
    assert.equal(typeof antiguos[0]._fn, 'function', 'no registró el handler por addListener')

    const toggle = doc.getElementById('nav-toggle')
    toggle.click()
    assert.equal(abierto(doc), true)

    antiguos[0]._fn({ matches: true })
    assert.equal(abierto(doc), false, 'el camino antiguo también debe cerrar el panel')
  })
})
