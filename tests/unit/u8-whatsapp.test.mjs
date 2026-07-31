/* U8 · initWhatsApp() / RF05 — P3
   Único grupo que necesita tocar el fuente: CONTACT es `const` y initWhatsApp
   es una IIFE que ya corrió, así que la costura honesta es sustituir el
   literal antes de parsear. El arnés falla si la sustitución no casa.

   Las dos ramas se prueban SIEMPRE, sustituyendo el valor en ambos sentidos.
   La primera versión de este archivo probaba la rama vacía solo si el fuente
   estaba vacío, y al configurarse el número el 2026-07-31 dejó de cubrirla:
   un test condicionado al estado del fuente deja de probar justo cuando ese
   estado cambia, que es cuando más falta hace. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM, fuente, estaInstrumentado } from '../helpers/cargar-dom.mjs'

/* Casa el literal sea cual sea su valor actual: si se fijara la forma vacía,
   configurar el número rompería el fixture en vez de probarlo. */
const RE_CONTACT = /const CONTACT = \{ whatsapp: '([^']*)' \};/
const NUMERO_VALIDO = '584121234567'

const conNumero = valor => ({
  de: RE_CONTACT,
  a: `const CONTACT = { whatsapp: '${valor}' };`
})

describe('U8 · botón de WhatsApp (RF05)', () => {
  test('U8.1 · sin número configurado el botón no se publica', { skip: estaInstrumentado() && 'afirma sobre el fuente publicado' }, () => {
    const { doc } = cargarDOM({ sustituir: conNumero('') })
    const cta = doc.getElementById('wa-cta')

    assert.equal(cta.hidden, true, 'un enlace muerto es peor que ningún botón')
    assert.ok(
      !(cta.getAttribute('href') || '').includes('wa.me'),
      'no debe quedar un href a wa.me sin número'
    )
  })

  test('U8.2 · con número configurado el enlace queda completo y seguro', { skip: estaInstrumentado() && 'afirma sobre el fuente publicado' }, () => {
    const { doc } = cargarDOM({ sustituir: conNumero(NUMERO_VALIDO) })
    const cta = doc.getElementById('wa-cta')

    assert.equal(cta.getAttribute('href'), `https://wa.me/${NUMERO_VALIDO}`)
    assert.equal(cta.getAttribute('target'), '_blank')
    assert.equal(cta.hidden, false)

    const rel = cta.getAttribute('rel') || ''
    assert.ok(rel.includes('noopener'), 'falta noopener: la pestaña destino podría manipular la origen')
    assert.ok(rel.includes('noreferrer'), 'falta noreferrer')
  })

  test('U8.3 · el número del fuente, si existe, es solo dígitos', { skip: estaInstrumentado() && 'afirma sobre el fuente publicado' }, () => {
    /* El test que se cobró el 2026-07-31, en su primer encuentro con un número
       real: llegó como '+13235543854' y `https://wa.me/+1323...` no es la forma
       documentada —wa.me exige dígitos, sin `+`, espacios ni guiones—, o sea
       exactamente el «enlace muerto» que el comentario del código dice evitar. */
    const coincidencia = fuente().match(RE_CONTACT)

    assert.ok(coincidencia, 'no se encontró la constante CONTACT: cambió su forma en el fuente')

    const numero = coincidencia[1]
    if (numero === '') return // sin configurar: es un estado válido y documentado

    assert.match(
      numero, /^\d{8,15}$/,
      `CONTACT.whatsapp = "${numero}" — wa.me exige formato internacional solo con dígitos, ` +
      'sin +, espacios ni guiones'
    )
  })

  test('U8.4 · el fuente real publica el botón', () => {
    /* Comprueba el estado de VERDAD del repositorio, no el de un fixture. Si
       alguien vacía el número sin querer, esto lo delata; si se vacía a
       propósito, este test es el que hay que cambiar, y ese cambio deja
       constancia de la decisión. */
    const { doc, lexico } = cargarDOM()
    const numero = lexico('CONTACT.whatsapp')

    assert.notEqual(numero, '', 'CONTACT.whatsapp está vacío: el botón no se publicaría')
    assert.equal(doc.getElementById('wa-cta').hidden, false)
    assert.equal(doc.getElementById('wa-cta').getAttribute('href'), `https://wa.me/${numero}`)
  })

  test('U8.5 · la sustitución del fixture casa de verdad', { skip: estaInstrumentado() && 'afirma sobre el fuente publicado' }, () => {
    /* Guarda contra el test vacuo: si el fuente se reescribe y el reemplazo
       deja de casar, U8.1 y U8.2 estarían pasando sin probar nada. */
    assert.throws(
      () => cargarDOM({ sustituir: { de: /literal que no existe en el fuente/, a: 'x' } }),
      /no casó/,
      'el arnés debe fallar cuando la sustitución no encuentra su objetivo'
    )

    assert.ok(RE_CONTACT.test(fuente()), 'el literal de CONTACT cambió de forma')
  })
})
