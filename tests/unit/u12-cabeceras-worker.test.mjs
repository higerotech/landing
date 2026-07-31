/* U12 · Coherencia entre los dos caminos a producción
   ADR-0006 introduce un Worker que sirve el apex y `www`, y deja el contenedor
   como contingencia sirviendo `demo.`. Eso significa **dos definiciones de las
   mismas cabeceras de seguridad** —`security-headers.conf` y `cloudflare/_headers`—
   sin ningún build que las sincronice.

   Es la misma clase de deriva que ya obligó a escribir U2.5 cuando el
   `@font-face` quedó duplicado, y con más motivo: son cabeceras de seguridad.
   El propio ADR la registra como deuda asumida **con esta prueba como
   mitigación**. Sin ella, la decisión introduce el problema que este
   repositorio lleva semanas corrigiendo. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { estaInstrumentado } from '../helpers/cargar-dom.mjs'

const leer = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

/** `add_header Nombre "valor" always;` → { nombre: valor } */
function cabecerasDeNginx (texto) {
  const mapa = {}
  const re = /^\s*add_header\s+(\S+)\s+"([^"]*)"/gm
  let m
  while ((m = re.exec(texto))) mapa[m[1].toLowerCase()] = m[2].trim()
  return mapa
}

/** Las líneas indentadas bajo la regla `/*` de un archivo `_headers`. */
function cabecerasDeWorker (texto) {
  const mapa = {}
  let dentro = false
  for (const linea of texto.split('\n')) {
    if (/^\s*#/.test(linea) || !linea.trim()) continue
    if (/^\/\S*/.test(linea)) { dentro = linea.trim() === '/*'; continue }
    if (!dentro) continue
    const m = linea.match(/^\s+([A-Za-z-]+):\s*(.+?)\s*$/)
    if (m) mapa[m[1].toLowerCase()] = m[2].trim()
  }
  return mapa
}

describe('U12 · las cabeceras de los dos caminos no divergen', () => {
  const nginx = cabecerasDeNginx(leer('security-headers.conf'))
  const worker = cabecerasDeWorker(leer('cloudflare/_headers'))

  test('U12.1 · ambos archivos declaran el mismo conjunto de cabeceras', {
    skip: estaInstrumentado() && 'afirma sobre archivos del repositorio'
  }, () => {
    assert.ok(Object.keys(nginx).length >= 7, 'no se parsearon las cabeceras de nginx')

    const soloNginx = Object.keys(nginx).filter(k => !(k in worker)).sort()
    const soloWorker = Object.keys(worker).filter(k => !(k in nginx)).sort()

    assert.deepEqual(soloNginx, [], 'cabeceras que nginx envía y el Worker no')
    assert.deepEqual(soloWorker, [], 'cabeceras que el Worker envía y nginx no')
  })

  test('U12.2 · y con el mismo valor', {
    skip: estaInstrumentado() && 'afirma sobre archivos del repositorio'
  }, () => {
    /* El valor importa tanto como la presencia: una CSP con una directiva de
       menos protege menos, y sería invisible comparando solo los nombres. */
    const distintos = Object.keys(nginx)
      .filter(k => k in worker && nginx[k] !== worker[k])
      .map(k => `${k}\n      nginx:  ${nginx[k]}\n      worker: ${worker[k]}`)

    assert.deepEqual(distintos, [], 'mismo nombre, distinto valor')
  })

  test('U12.3 · lo que se publica en el Worker es lo mismo que copia el Dockerfile', {
    skip: estaInstrumentado() && 'afirma sobre archivos del repositorio'
  }, async () => {
    /* Dos listas de inclusión describiendo «qué se publica». Si alguien añade
       un archivo al Dockerfile y se olvida del script, el sitio del Worker
       saldría incompleto — y al revés, se publicaría algo que la imagen no
       tiene. Ninguna de las dos cosas daría error por sí sola. */
    const { PUBLICABLES } = await import('../../scripts/preparar-assets.mjs')

    const delDockerfile = [...leer('Dockerfile').matchAll(/^COPY\s+(\S+)\s+\/usr\/share\/nginx\/html/gm)]
      .map(m => m[1].replace(/\/$/, ''))
      .sort()

    assert.deepEqual(
      [...PUBLICABLES].sort(),
      delDockerfile,
      'la lista de publicables y los COPY del Dockerfile ya no coinciden'
    )
  })
})
