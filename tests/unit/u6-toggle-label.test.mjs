/* U6 · syncToggleLabel() — P4
   Los valores esperados se leen del propio DOM, nunca como literales: si se
   hardcodean, cada ajuste de copy rompe el suite y el equipo aprende a
   ignorarlo, que es como mueren las suites. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

const COMBINACIONES = [
  { idioma: 'es', abierto: false, atributo: 'data-label-open' },
  { idioma: 'es', abierto: true, atributo: 'data-label-close' },
  { idioma: 'en', abierto: false, atributo: 'data-label-open-en' },
  { idioma: 'en', abierto: true, atributo: 'data-label-close-en' }
]

describe('U6 · etiqueta accesible del toggle', () => {
  for (const { idioma, abierto, atributo } of COMBINACIONES) {
    const estado = abierto ? 'abierto' : 'cerrado'

    test(`U6 · menú ${estado} en ${idioma} usa ${atributo}`, () => {
      const { win, doc } = cargarDOM()
      const toggle = doc.getElementById('nav-toggle')

      win.setLang(idioma)
      win.setMenu(abierto)

      assert.equal(
        toggle.getAttribute('aria-label'),
        toggle.getAttribute(atributo),
        `con el menú ${estado} en ${idioma} la aria-label debe salir de ${atributo}`
      )
    })
  }

  test('U6.5 · cambiar de idioma con el menú abierto reetiqueta el toggle', () => {
    // Es el cruce que se olvida: la etiqueta depende de DOS estados a la vez.
    const { win, doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    win.setMenu(true)
    win.setLang('en')

    assert.equal(toggle.getAttribute('aria-label'), toggle.getAttribute('data-label-close-en'))
  })
})
