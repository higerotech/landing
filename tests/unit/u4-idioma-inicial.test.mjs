/* U4 · idiomaInicial() — P2
   Prioridad declarada en el código: ?lang= > preferencia guardada > 'es'.
   Se asserta `documentElement.lang` porque es el resultado de la llamada real
   de la línea 991; llamar a la función después de la carga leería un
   localStorage que setLang ya reescribió. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

/** Prepara un localStorage con un idioma ya guardado. */
const conGuardado = valor => win => {
  win.localStorage.setItem('lang', valor)
}

/** Sustituye localStorage por uno que lanza al leer: modo privado. */
const conStorageBloqueado = win => {
  Object.defineProperty(win, 'localStorage', {
    configurable: true,
    value: {
      getItem () { throw new Error('acceso denegado') },
      setItem () { throw new Error('acceso denegado') },
      removeItem () {}
    }
  })
}

describe('U4 · resolución del idioma inicial', () => {
  test('U4.1 · ?lang=en gana cuando no hay nada guardado', () => {
    const { doc } = cargarDOM({ url: 'https://higerotech.com/?lang=en' })
    assert.equal(doc.documentElement.lang, 'en')
  })

  test('U4.2 · la query gana sobre la preferencia guardada', () => {
    const { doc } = cargarDOM({
      url: 'https://higerotech.com/?lang=es',
      alPreparar: conGuardado('en')
    })
    assert.equal(doc.documentElement.lang, 'es', 'un enlace compartido debe mandar')
  })

  test('U4.3 · una query inválida cae a la preferencia guardada', () => {
    const { doc } = cargarDOM({
      url: 'https://higerotech.com/?lang=fr',
      alPreparar: conGuardado('en')
    })
    assert.equal(doc.documentElement.lang, 'en')
  })

  test('U4.4 · con query y guardado inválidos, cae a es', () => {
    const { doc } = cargarDOM({
      url: 'https://higerotech.com/?lang=fr',
      alPreparar: conGuardado('fr')
    })
    assert.equal(doc.documentElement.lang, 'es')
  })

  test('U4.5 · sin query manda la preferencia guardada', () => {
    const { doc } = cargarDOM({ alPreparar: conGuardado('en') })
    assert.equal(doc.documentElement.lang, 'en')
  })

  test('U4.6 · con localStorage bloqueado no propaga y cae a es', () => {
    /* La rama que el código comenta como «localStorage bloqueado» y que hasta
       ahora no había ejercitado nadie. */
    const { doc, errores } = cargarDOM({ alPreparar: conStorageBloqueado })

    assert.deepEqual(
      errores.map(e => e.message ?? String(e)), [],
      'el modo privado no debe romper la página'
    )
    assert.equal(doc.documentElement.lang, 'es')
  })

  test('U4.7 · ?lang=EN sirve español — comportamiento actual, no deseado', () => {
    /* IDIOMAS.indexOf(q) distingue mayúsculas, así que un enlace compartido en
       mayúsculas pierde el idioma sin ningún síntoma. Este test NO valida un
       acierto: fija el comportamiento para que deje de ser accidental.

       Si se decide normalizar con .toLowerCase(), este test debe cambiar de
       expectativa a 'en' — y ese cambio es justamente la señal de que la
       decisión se tomó a propósito. Ver `docs/04-testing/unit-tests.md` §U4. */
    const { doc } = cargarDOM({ url: 'https://higerotech.com/?lang=EN' })
    assert.equal(doc.documentElement.lang, 'es')
  })
})
