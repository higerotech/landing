/* U8 · initWhatsApp() / RF05 — P3
   Único grupo que necesita tocar el fuente: CONTACT es `const` y initWhatsApp
   es una IIFE que ya corrió, así que la costura honesta es sustituir el
   literal antes de parsear. El arnés falla si la sustitución no casa. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM, fuente } from '../helpers/cargar-dom.mjs'

const LITERAL_VACIO = "const CONTACT = { whatsapp: '' };"
const NUMERO_VALIDO = '584121234567'

describe('U8 · botón de WhatsApp (RF05)', () => {
  test('U8.1 · sin número configurado el botón no se publica', () => {
    const { doc, lexico } = cargarDOM()
    const cta = doc.getElementById('wa-cta')
    const numero = lexico('CONTACT.whatsapp')

    if (numero) {
      // Ya se configuró: este caso deja de aplicar y U8.2/U8.3 lo cubren.
      assert.equal(cta.hidden, false)
      return
    }

    assert.equal(cta.hidden, true, 'un enlace muerto es peor que ningún botón')
    assert.ok(
      !(cta.getAttribute('href') || '').includes('wa.me'),
      'no debe quedar un href a wa.me sin número'
    )
  })

  test('U8.2 · con número configurado el enlace queda completo y seguro', () => {
    const { doc } = cargarDOM({
      sustituir: {
        de: LITERAL_VACIO,
        a: `const CONTACT = { whatsapp: '${NUMERO_VALIDO}' };`
      }
    })
    const cta = doc.getElementById('wa-cta')

    assert.equal(cta.getAttribute('href'), `https://wa.me/${NUMERO_VALIDO}`)
    assert.equal(cta.getAttribute('target'), '_blank')
    assert.equal(cta.hidden, false)

    const rel = cta.getAttribute('rel') || ''
    assert.ok(rel.includes('noopener'), 'falta noopener: la pestaña destino podría manipular la origen')
    assert.ok(rel.includes('noreferrer'), 'falta noreferrer')
  })

  test('U8.3 · el número del fuente, si existe, es solo dígitos', () => {
    /* Este es el test que se cobra el día que se rellene el número. La forma
       natural de escribirlo —con prefijo + y separadores— produce
       `https://wa.me/+58 412-...`, exactamente el «enlace muerto» que el
       comentario del código dice querer evitar. */
    const src = fuente()
    const coincidencia = src.match(/const CONTACT = \{\s*whatsapp:\s*'([^']*)'\s*\}/)

    assert.ok(coincidencia, 'no se encontró la constante CONTACT: cambió su forma en el fuente')

    const numero = coincidencia[1]
    if (numero === '') return // pendiente de configurar, es el estado documentado

    assert.match(
      numero, /^\d{8,15}$/,
      `CONTACT.whatsapp = "${numero}" — wa.me exige formato internacional solo con dígitos, ` +
      'sin +, espacios ni guiones'
    )
  })

  test('U8.4 · la sustitución del fixture casa de verdad', () => {
    /* Guarda contra el test vacuo: si el fuente se reescribe y el reemplazo
       deja de casar, U8.2 estaría pasando sin probar nada. */
    assert.throws(
      () => cargarDOM({ sustituir: { de: 'literal que no existe en el fuente', a: 'x' } }),
      /no casó/,
      'el arnés debe fallar cuando la sustitución no encuentra su objetivo'
    )

    assert.doesNotThrow(
      () => cargarDOM({ sustituir: { de: LITERAL_VACIO, a: LITERAL_VACIO } }),
      'el literal de CONTACT cambió de forma: U8.2 ya no estaría probando nada'
    )
  })
})
