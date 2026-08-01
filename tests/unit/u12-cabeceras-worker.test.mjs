/* U12 · Coherencia entre los dos caminos a producción
   ADR-0006 introduce un Worker que sirve el apex y `www`, y deja el contenedor
   como contingencia sirviendo `demo.`. Eso significa **dos definiciones de las
   mismas cabeceras de seguridad** —`security-headers.conf` y `cloudflare/_headers`—
   sin ningún build que las sincronice.

   Es la misma clase de deriva que ya obligó a escribir U2.5 cuando el
   `@font-face` quedó duplicado, y con más motivo: son cabeceras de seguridad.
   El propio ADR la registra como deuda asumida **con esta prueba como
   mitigación**. Sin ella, la decisión introduce el problema que este
   repositorio lleva semanas corrigiendo.

   Desde el 2026-07-31 el contrato tiene dos piezas y no una: un valor POR
   DEFECTO para todo el sitio, y una lista de assets de marca donde CORP se
   abre a `cross-origin`. Las dos piezas se expresan distinto en cada camino
   —un `map` en nginx, `run_worker_first` en `wrangler.jsonc`— así que hay dos
   listas que también pueden divergir. U12.4 las compara. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { estaInstrumentado } from '../helpers/cargar-dom.mjs'

const leer = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

/** Los bloques `map $entrada $salida { … }` de `nginx.conf`, por variable de salida. */
function mapasDeNginx (texto) {
  const mapas = {}
  for (const [, entrada, salida, cuerpo] of texto.matchAll(/map\s+\$(\w+)\s+\$(\w+)\s*\{([^}]*)\}/g)) {
    const entradas = {}
    for (const [, clave, valor] of cuerpo.matchAll(/^\s*"?([^"\s]+)"?\s+"([^"]*)"\s*;/gm)) {
      entradas[clave] = valor
    }
    mapas[salida] = { entrada, entradas }
  }
  return mapas
}

/** Resuelve `$corp` (y `$acao`, que depende de `$corp`) a su valor por defecto. */
function resolverPorDefecto (valor, mapas) {
  const m = valor.match(/^\$(\w+)$/)
  if (!m) return valor

  const mapa = mapas[m[1]]
  assert.ok(mapa, `el snippet usa $${m[1]} y no hay ningún \`map\` que lo defina`)

  /* `map $uri $x` se resuelve por su rama `default`. `map $corp $y` se
     encadena: la clave que toca es el valor por defecto de `$corp`. */
  if (mapa.entrada === 'uri') return mapa.entradas.default
  return mapa.entradas[resolverPorDefecto(`$${mapa.entrada}`, mapas)]
}

/** `add_header Nombre "valor" always;` → { nombre: valor }, ya resuelto. */
function cabecerasDeNginx (snippet, mapas) {
  const mapa = {}
  for (const [, nombre, valor] of snippet.matchAll(/^\s*add_header\s+(\S+)\s+"([^"]*)"/gm)) {
    const resuelto = resolverPorDefecto(valor.trim(), mapas)
    /* nginx omite la cabecera cuando el valor sale vacío: por defecto no se
       emite, así que tampoco debe estar en el `/*` del Worker. */
    if (resuelto !== '') mapa[nombre.toLowerCase()] = resuelto
  }
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
  const mapas = mapasDeNginx(leer('nginx.conf'))
  const nginx = cabecerasDeNginx(leer('security-headers.conf'), mapas)
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

  test('U12.4 · los assets abiertos a otros orígenes son los mismos en los dos caminos', {
    skip: estaInstrumentado() && 'afirma sobre archivos del repositorio'
  }, () => {
    /* La excepción a CORP se expresa distinto a cada lado —un `map` en nginx,
       `run_worker_first` en `wrangler.jsonc`— y son dos listas escritas a
       mano. Divergir aquí no rompe nada visible: el asset simplemente se
       incrusta desde fuera por un camino y no por el otro, según qué hostname
       haya servido la página. Es un fallo silencioso, que es el peor. */
    const deNginx = Object.entries(mapas.corp.entradas)
      .filter(([clave, valor]) => clave !== 'default' && valor === 'cross-origin')
      .map(([clave]) => clave)
      .sort()

    /* `wrangler.jsonc` lleva comentarios, así que no vale `JSON.parse` a secas. */
    const jsonc = leer('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, '')
    const delWorker = [...JSON.parse(jsonc).assets.run_worker_first].sort()

    assert.ok(deNginx.length > 0, 'no se parseó el `map $uri $corp` de nginx.conf')
    assert.deepEqual(
      deNginx,
      delWorker,
      'las rutas abiertas a otros orígenes ya no coinciden entre nginx y el Worker'
    )
  })
})
