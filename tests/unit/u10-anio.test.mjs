/* U10 · Sello del año — P6
   Con una fecha fija y no `new Date().getFullYear()` en la aserción: comparar
   el año actual contra el año actual también pasaría si alguien hubiera
   escrito el año a mano en el HTML. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarDOM } from '../helpers/cargar-dom.mjs'

const ANIO_FIJO = 2031

describe('U10 · año del pie', () => {
  test('U10.1 · el año se calcula, no está escrito a mano', () => {
    const { doc } = cargarDOM({
      alPreparar (win) {
        win.Date = function FechaFija () {
          return { getFullYear: () => ANIO_FIJO }
        }
      }
    })

    assert.equal(doc.getElementById('year').textContent, String(ANIO_FIJO))
  })
})
