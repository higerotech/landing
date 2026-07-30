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

  test('U7.5 · Escape con el menú cerrado no altera el estado', () => {
    const { win, doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')
    const antes = toggle.getAttribute('aria-expanded')

    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    assert.equal(toggle.getAttribute('aria-expanded'), antes)
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
})
