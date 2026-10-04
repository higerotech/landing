/* U14 · El verificador de publicables
   `scripts/verificar-publicable.mjs` impide empaquetar el sitio mientras un
   archivo publicable lleve un marcador `<TODO: …>` sin resolver. Hoy los
   llevan: las páginas legales esperan la razón social, el RIF y el domicilio de
   la entidad, más la institución arbitral.

   Estas pruebas **no comprueban que hoy pase** —hoy no pasa, y debe no pasar—
   sino que el verificador FUNCIONE. La distinción importa: un guardia que nadie
   ha visto detener nada es indistinguible de uno roto, y este guardia es lo
   único que separa un borrador de una política de privacidad publicada.

   Por eso tampoco vive en `npm test` como una aserción sobre el estado del
   repositorio. El workflow de despliegue tiene escrito el motivo y vale para
   esto: «un CI que falla por diseño enseña a ignorar los fallos». */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buscarPendientes, archivosPublicables } from '../../scripts/verificar-publicable.mjs'
import { PUBLICABLES } from '../../scripts/preparar-assets.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Corre el verificador sobre contenido inventado, sin tocar el disco. */
const sobre = contenido => buscarPendientes({
  archivos: ['ficticio.html'],
  leer: () => contenido
})

describe('U14 · el verificador detecta lo que dice detectar', () => {
  test('U14.1 · encuentra el marcador tal como se ve en una página publicada', () => {
    /* Esta es la forma que importa y la que un `grep "<TODO"` NO encuentra: en
       el HTML de las páginas legales el marcador es texto visible, así que
       viaja escapado. */
    const hallazgos = sobre('<p>El responsable es <strong>&lt;TODO: razón social&gt;</strong>.</p>')

    assert.equal(hallazgos.length, 1)
    assert.equal(hallazgos[0].linea, 1)
    assert.match(hallazgos[0].texto, /TODO: razón social/)
  })

  test('U14.2 · encuentra el marcador en el fuente y da su línea', () => {
    const hallazgos = sobre([
      '<!doctype html>',
      '<!-- <TODO: decidir el plazo de retención> -->',
      '<p>nada aquí</p>'
    ].join('\n'))

    assert.equal(hallazgos.length, 1)
    assert.equal(hallazgos[0].linea, 2, 'la línea mal contada obliga a buscar a mano')
  })

  test('U14.3 · no salta con prosa legítima', () => {
    /* El mismo cuidado que hubo que tener con la regla 10027 de ZAP y con
       U11.9: «todo» es una palabra castellana corriente. El verificador exige
       la forma `<TODO`, no la palabra. */
    const inocentes = [
      '<p>Todo el contenido de esta página es informativo.</p>',
      '<p>Esto cubre todo lo relativo a las cookies.</p>',
      '<p>Guardamos todos los mensajes durante 24 meses.</p>',
      '/* Los tokens de :root están copiados de index.html */'
    ]

    for (const texto of inocentes) {
      assert.deepEqual(sobre(texto), [], `falso positivo con: ${texto}`)
    }
  })

  test('U14.4 · mira los archivos que un visitante puede leer, y no los binarios', () => {
    const archivos = archivosPublicables(PUBLICABLES)

    assert.ok(archivos.includes('index.html'), 'no incluyó la página de inicio')
    assert.ok(archivos.includes('privacidad.html'), 'no incluyó una página legal')
    assert.ok(archivos.includes('assets/sitio.js'), 'no expandió el directorio assets/')
    assert.ok(archivos.includes('assets/legal.css'), 'no incluyó la hoja de las legales')

    const binarios = archivos.filter(a => /\.(woff2|png|jpg|ico)$/i.test(a))
    assert.deepEqual(binarios, [], 'no tiene sentido buscar marcadores en un binario')
  })
})

describe('U14 · el estado actual, y que no se extienda', () => {
  test('U14.5 · los marcadores pendientes están solo donde se sabe que están', () => {
    /* Esto NO exige que haya marcadores: si el owner rellena los datos, la
       lista se vacía y la prueba sigue pasando. Lo que exige es que no
       aparezcan en ninguna OTRA página publicada — que un borrador no se cuele
       en el aviso de cookies, en la política de IA o en la página de inicio sin
       que nadie lo note. */
    const CON_PENDIENTES = new Set([
      'privacidad.html', 'privacy.html', // identificación de la entidad
      'terminos.html', 'terms.html' //      entidad + institución arbitral
    ])

    const pendientes = buscarPendientes({ archivos: archivosPublicables(PUBLICABLES) })
    const inesperados = [...new Set(pendientes.map(p => p.archivo))]
      .filter(a => !CON_PENDIENTES.has(a))
      .sort()

    assert.deepEqual(
      inesperados, [],
      'apareció un marcador sin resolver en un archivo publicable que no lo tenía'
    )
  })

  test('U14.6 · `npm run preparar` se NIEGA a empaquetar mientras queden', {
    /* La prueba de integración del guardia: no basta con que la función
       detecte, tiene que impedir el empaquetado. Es el paso que el workflow de
       despliegue ejecuta justo antes de `wrangler deploy`, así que esto es lo
       que separa un borrador de producción.

       Se salta cuando no queda ninguno: ese día el comando debe pasar, y
       comprobar que «falla» sería exigir que el repositorio siga incompleto. */
    skip: buscarPendientes({ archivos: archivosPublicables(PUBLICABLES) }).length === 0 &&
      'ya no quedan marcadores: el empaquetado debe pasar, no fallar'
  }, () => {
    const r = spawnSync(process.execPath, ['scripts/preparar-assets.mjs'], {
      cwd: RAIZ, encoding: 'utf8'
    })

    assert.equal(r.status, 1, 'preparar-assets.mjs empaquetó un sitio con marcadores sin resolver')
    assert.match(r.stderr, /No se empaqueta/, 'falló, pero sin decir por qué')
    assert.match(r.stderr, /verificar:publicable/, 'no dice cómo ver el detalle')
  })
})
