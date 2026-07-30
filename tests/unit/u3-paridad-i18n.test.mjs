/* U3 · Paridad bilingüe — P1
   Es el riesgo R2, registrado en los requisitos como «mitigado por proceso;
   pendiente prueba automatizada». Esta es esa prueba. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

/** Normaliza markup pasándolo por el parser, para no comparar contra las
 *  comillas simples del atributo (`class='grad'`) que el DOM reescribe. */
function normalizar (doc, markup) {
  const scratch = doc.createElement('div')
  scratch.innerHTML = markup
  return scratch.innerHTML
}

describe('U3 · paridad del contenido bilingüe (riesgo R2)', () => {
  test('U3.1 · todo data-es tiene su data-en y al revés', () => {
    const { doc } = cargarDOM()

    const soloEs = [...doc.querySelectorAll('[data-es]:not([data-en])')]
    const soloEn = [...doc.querySelectorAll('[data-en]:not([data-es])')]

    const describir = el => `<${el.tagName.toLowerCase()}> "${(el.textContent || '').trim().slice(0, 45)}"`

    assert.deepEqual(
      soloEs.map(describir), [],
      'elementos con data-es y sin data-en: al pasar a inglés se quedan en español'
    )
    assert.deepEqual(
      soloEn.map(describir), [],
      'elementos con data-en y sin data-es: al volver a español perderían el texto'
    )

    // El invariante es la paridad, no un número concreto: fijar la cantidad
    // rompería el suite en cada línea de copy nueva.
    const pares = doc.querySelectorAll('[data-es][data-en]')
    assert.ok(pares.length > 0, 'no hay ningún par bilingüe: el esquema cambió')
  })

  test('U3.2 · ningún valor de traducción está vacío', () => {
    const { doc } = cargarDOM()
    const vacios = []

    for (const el of doc.querySelectorAll('[data-es][data-en]')) {
      for (const idioma of ['es', 'en']) {
        const valor = el.getAttribute(`data-${idioma}`)
        if (!valor || valor.trim().length === 0) {
          vacios.push(`data-${idioma} de <${el.tagName.toLowerCase()}>`)
        }
      }
    }

    assert.deepEqual(vacios, [], 'una traducción vacía se ve como un hueco en la página')
  })

  test('U3.3 · setLang aplica el idioma a todos los nodos', () => {
    const { win, doc } = cargarDOM()

    for (const idioma of ['en', 'es']) {
      win.setLang(idioma)

      for (const el of doc.querySelectorAll('[data-es][data-en]')) {
        assert.equal(
          el.innerHTML,
          normalizar(doc, el.getAttribute(`data-${idioma}`)),
          `un nodo no adoptó el contenido de data-${idioma}`
        )
      }
    }
  })

  test('U3.4 · cuatro ciclos es→en no pierden contenido', () => {
    /* Automatiza la comprobación manual registrada en
       `docs/05-deployment/deployment.md` §Verificación. */
    const { win, doc } = cargarDOM()

    win.setLang('es')
    const original = [...doc.querySelectorAll('[data-es][data-en]')].map(el => el.innerHTML)

    for (let i = 0; i < 4; i++) {
      win.setLang('en')
      win.setLang('es')
    }

    const despues = [...doc.querySelectorAll('[data-es][data-en]')].map(el => el.innerHTML)

    assert.equal(despues.length, original.length, 'se perdieron nodos por el camino')
    assert.deepEqual(despues, original, 'el contenido no volvió a su estado inicial')
  })

  test('U3.5 · ningún valor de traducción trae markup ejecutable', () => {
    /* setLang inyecta estos valores con innerHTML, que no filtra nada. Hoy son
       contenido estático de autor y no hay riesgo, pero un `<img src=x
       onerror=…>` pegado en un data-en SÍ ejecutaría. Cinco líneas de coste.
       Mapea al A05 de `.ai-dlc/owasp-mapping.md`. */
    const { doc } = cargarDOM()

    const PROHIBIDO = [
      { patron: /<\s*script/i, motivo: '<script>' },
      { patron: /<\s*iframe/i, motivo: '<iframe>' },
      { patron: /<\s*object/i, motivo: '<object>' },
      { patron: /\bsrcdoc\s*=/i, motivo: 'srcdoc=' },
      { patron: /\bjavascript\s*:/i, motivo: 'javascript:' },
      { patron: /\son[a-z]+\s*=/i, motivo: 'atributo de evento on*=' }
    ]

    const hallazgos = []

    for (const el of doc.querySelectorAll('[data-es][data-en]')) {
      for (const idioma of ['es', 'en']) {
        const valor = el.getAttribute(`data-${idioma}`) ?? ''
        for (const { patron, motivo } of PROHIBIDO) {
          if (patron.test(valor)) hallazgos.push(`data-${idioma} contiene ${motivo}`)
        }
      }
    }

    assert.deepEqual(hallazgos, [], 'markup ejecutable en un atributo que va a innerHTML')
  })

  test('U3.6 · no hay pares bilingües anidados', () => {
    /* Valida la guarda `isConnected` de la línea 953: si un [data-es] quedara
       dentro de otro, reescribir el externo desconectaría al interno y su
       contenido se perdería en silencio. Hoy no ocurre; el test lo mantiene
       así. */
    const { doc } = cargarDOM()

    const anidados = [...doc.querySelectorAll('[data-es][data-en] [data-es][data-en]')]

    assert.deepEqual(
      anidados.map(el => `<${el.tagName.toLowerCase()}>`), [],
      'un par bilingüe anidado dentro de otro pierde su contenido al cambiar de idioma'
    )
  })
})
