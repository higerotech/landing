/* U5 · Efectos de setLang() — P2 */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

describe('U5 · efectos de setLang()', () => {
  test('U5.1 · un idioma desconocido cae a es', () => {
    const { win, doc } = cargarDOM()
    win.setLang('fr')
    assert.equal(doc.documentElement.lang, 'es')
  })

  test('U5.2 · los botones reflejan el idioma de forma excluyente', () => {
    const { win, doc } = cargarDOM()
    const btnEs = doc.getElementById('btn-es')
    const btnEn = doc.getElementById('btn-en')

    win.setLang('en')
    assert.equal(btnEn.getAttribute('aria-pressed'), 'true')
    assert.equal(btnEs.getAttribute('aria-pressed'), 'false')
    assert.equal(btnEn.classList.contains('active'), true)
    assert.equal(btnEs.classList.contains('active'), false)

    win.setLang('es')
    assert.equal(btnEs.getAttribute('aria-pressed'), 'true')
    assert.equal(btnEn.getAttribute('aria-pressed'), 'false')
    assert.equal(btnEs.classList.contains('active'), true)
    assert.equal(btnEn.classList.contains('active'), false)
  })

  test('U5.3 · el idioma queda persistido', () => {
    const { win } = cargarDOM()
    win.setLang('en')
    assert.equal(win.localStorage.getItem('lang'), 'en')
  })

  test('U5.4 · si falla la persistencia, el DOM ya quedó aplicado', () => {
    /* localStorage.setItem es la ÚLTIMA sentencia de setLang: el orden
       garantiza que un fallo de persistencia no deje el idioma a medio
       aplicar. Este test fija ese orden para que un refactor no lo invierta
       sin darse cuenta. */
    const { win, doc } = cargarDOM({
      alPreparar (w) {
        Object.defineProperty(w, 'localStorage', {
          configurable: true,
          value: {
            getItem: () => null,
            setItem () { throw new Error('cuota agotada') },
            removeItem () {}
          }
        })
      }
    })

    assert.doesNotThrow(() => win.setLang('en'), 'setLang no debe propagar el fallo')
    assert.equal(doc.documentElement.lang, 'en', 'el idioma debe haberse aplicado igual')
  })

  test('U5.6 · los botones de idioma están cableados', () => {
    /* Hueco que encontró el medidor de cobertura: el resto de U5 llama a
       setLang() directamente, así que los handlers de las líneas 972-973 no
       los ejecutaba nadie. Un botón desconectado habría pasado el suite. */
    const { doc } = cargarDOM()

    doc.getElementById('btn-en').click()
    assert.equal(doc.documentElement.lang, 'en')

    doc.getElementById('btn-es').click()
    assert.equal(doc.documentElement.lang, 'es')
  })

  test('U5.5 · currentLang y la etiqueta del toggle siguen al idioma', () => {
    const { win, doc, lexico } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    win.setLang('en')
    assert.equal(lexico('currentLang'), 'en')
    assert.equal(toggle.getAttribute('aria-label'), toggle.getAttribute('data-label-open-en'))

    win.setLang('es')
    assert.equal(lexico('currentLang'), 'es')
    assert.equal(toggle.getAttribute('aria-label'), toggle.getAttribute('data-label-open'))
  })
})
