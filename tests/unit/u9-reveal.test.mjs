/* U9 · Scroll reveal — P5
   Con `.reveal { opacity: 0 }`, U9.1 es la diferencia entre un sitio visible y
   uno invisible en navegadores sin IntersectionObserver. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

describe('U9 · aparición al hacer scroll', () => {
  test('U9.1 · sin IntersectionObserver se revela todo de golpe', () => {
    // jsdom no lo implementa, así que la rama de respaldo se ejercita sola.
    const { doc, win } = cargarDOM()

    assert.equal('IntersectionObserver' in win, false, 'el entorno no debía traerlo')

    const sinIn = [...doc.querySelectorAll('.reveal')].filter(el => !el.classList.contains('in'))
    assert.equal(sinIn.length, 0, 'la rama de respaldo debe revelar todos los elementos')
  })

  test('U9.2 · con observer, cada elemento se revela al entrar y deja de observarse', () => {
    const { doc, IOFalso } = cargarDOM({ conIO: true })

    const observer = IOFalso.instancias[0]
    assert.ok(observer, 'el script no construyó ningún IntersectionObserver')

    const reveal = [...doc.querySelectorAll('.reveal')]
    assert.equal(observer.observados.length, reveal.length, 'debe observar todos los .reveal')

    // Con el observer presente, nada se revela hasta entrar en el viewport.
    assert.equal(
      reveal.filter(el => el.classList.contains('in')).length, 0,
      'con observer no debe revelarse nada de entrada'
    )

    const primero = reveal[0]
    observer.disparar(primero, true)

    assert.equal(primero.classList.contains('in'), true, 'el elemento que entra debe revelarse')
    assert.deepEqual(observer.desobservados, [primero], 'debe dejar de observar lo ya revelado')
    assert.equal(
      reveal.slice(1).filter(el => el.classList.contains('in')).length, 0,
      'los demás elementos no deben revelarse todavía'
    )
  })

  test('U9.3 · una entrada que no intersecta no revela nada', () => {
    const { doc, IOFalso } = cargarDOM({ conIO: true })
    const observer = IOFalso.instancias[0]
    const primero = doc.querySelector('.reveal')

    observer.disparar(primero, false)

    assert.equal(primero.classList.contains('in'), false)
    assert.deepEqual(observer.desobservados, [], 'no debe desobservar lo que aún no entró')
  })

  test('U9.4 · el observer se construye con el umbral previsto', () => {
    const { IOFalso } = cargarDOM({ conIO: true })
    assert.equal(IOFalso.instancias[0].opciones.threshold, 0.12)
  })
})
