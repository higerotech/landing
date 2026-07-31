/* U2 · Contrato JS↔DOM — P0
   El script referencia seis `id` sin ninguna guarda de nulidad. Estos tests
   localizan cuál se rompió; U1 solo dice que algo se rompió. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM, fuente } from '../helpers/cargar-dom.mjs'

const IDS_EXIGIDOS = ['wa-cta', 'nav-toggle', 'nav-links', 'btn-es', 'btn-en', 'year']

const ETIQUETAS_TOGGLE = [
  'data-label-open',
  'data-label-close',
  'data-label-open-en',
  'data-label-close-en'
]

describe('U2 · contrato entre el script y el DOM', () => {
  test('U2.1 · los seis id que el script exige existen y son únicos', () => {
    const { doc } = cargarDOM()

    for (const id of IDS_EXIGIDOS) {
      const coincidencias = doc.querySelectorAll(`[id="${id}"]`)
      assert.equal(
        coincidencias.length, 1,
        `#${id}: se esperaba exactamente 1 elemento, hay ${coincidencias.length}. ` +
        'Cero rompe el script; dos o más hacen que getElementById devuelva el ' +
        'primero y el bug se manifieste como «no responde».'
      )
    }
  })

  test('U2.2 · #nav-toggle lleva los cuatro atributos de etiqueta', () => {
    const { doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    for (const attr of ETIQUETAS_TOGGLE) {
      const valor = toggle.getAttribute(attr)
      assert.ok(
        valor && valor.trim().length > 0,
        `#nav-toggle carece de ${attr}: syncToggleLabel() pondría aria-label a null`
      )
    }
  })

  test('U2.4 · la hoja de estilos define una regla [hidden]', () => {
    /* Sin ella, el `display` del navegador para [hidden] lo pisa cualquier
       regla de autor que fije display —`.btn-secondary` usa inline-flex— y el
       atributo deja de ocultar. Le pasaba a #wa-cta: con el número sin
       configurar el botón se veía igual, un CTA muerto a `#contacto`.

       Esta es la guarda barata sobre el fuente. La comprobación de verdad, con
       cascada real, es E6.4 en las E2E: jsdom no resuelve el conflicto entre la
       hoja del navegador y la de autor, así que aquí no se puede verificar el
       comportamiento, solo que la regla exista. */
    assert.match(
      fuente(), /\[hidden\]\s*\{[^}]*display:\s*none[^}]*\}/,
      'falta la regla [hidden] { display: none !important }'
    )
  })

  test('U2.3 · #wa-cta sale del HTML oculto', () => {
    /* Protege la decisión de RF05: mientras CONTACT.whatsapp esté vacío el
       botón no debe publicarse. Si el atributo `hidden` se cae del HTML, el
       enlace muerto se publica aunque la constante siga vacía. */
    const { doc } = cargarDOM()
    const cta = doc.getElementById('wa-cta')
    const numero = cargarDOM().lexico('CONTACT.whatsapp')

    if (!numero) {
      assert.equal(cta.hidden, true, 'sin número configurado, #wa-cta debe estar oculto')
    }
  })
})
