#!/usr/bin/env node
/* ── Verifica los hostnames CANÓNICOS, tal y como los recibe un visitante ──
   Por qué existe este script, que es la parte importante:

   Hasta el 2026-07-31 el suite había corrido siempre contra `localhost`, contra
   el contenedor o contra `*.workers.dev`. **Nunca contra un hostname de la
   zona.** Y eso deja un hueco entero fuera de alcance: todo lo que Cloudflare
   añade en el borde —inyección de scripts, reglas de transformación, Rocket
   Loader, ofuscación de correo— no existe en ninguno de esos tres sitios.

   El hueco no era teórico. El paso 3 del cutover destapó que la zona inyectaba
   el beacon de Web Analytics en el HTML de todos sus hostnames, incluidos los
   que van por el túnel a nginx. Llevaba puesto en producción y los diez gates
   estaban en verde, porque ninguno miraba donde ocurría.

   Es la misma familia que la deriva de dos semanas: el artefacto era correcto
   y lo que recibía el visitante era otra cosa.

   Uso:  node scripts/verificar-zona.mjs [hostname…]                        */

import { readFileSync, existsSync } from 'node:fs'
import { setTimeout as esperar } from 'node:timers/promises'

/* Lo que el repositorio AFIRMA que debe ser cierto en producción. Los dominios
   propios se crean a mano en Cloudflare —el token de despliegue no toca DNS a
   propósito, ADR-0006— así que esta lista es la contrapartida: no los crea,
   pero no deja que se queden mal en silencio. */
const CANONICOS = [
  'higerotech.com',
  'www.higerotech.com'
]

const NAVEGADOR = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
}

/* Las cabeceras se leen de `cloudflare/_headers`, no se copian aquí. Una
   tercera lista escrita a mano sería una tercera cosa que puede divergir, que
   es justo el problema que U12 vigila entre las dos que ya hay. */
function contratoDeCabeceras () {
  const texto = readFileSync(new URL('../cloudflare/_headers', import.meta.url), 'utf8')
  const mapa = new Map()
  let dentro = false
  for (const linea of texto.split('\n')) {
    if (/^\s*#/.test(linea) || !linea.trim()) continue
    if (/^\/\S*/.test(linea)) { dentro = linea.trim() === '/*'; continue }
    if (!dentro) continue
    const m = linea.match(/^\s+([A-Za-z-]+):\s*(.+?)\s*$/)
    if (m) mapa.set(m[1].toLowerCase(), m[2].trim())
  }
  return mapa
}

const CONTRATO = contratoDeCabeceras()
const DIST = new URL('../dist/index.html', import.meta.url)
let sinDist = false

/* Los assets de marca que se abren a otros orígenes. Se leen de
   `wrangler.jsonc` en vez de copiarse aquí, por el mismo motivo que las
   cabeceras se leen de `_headers`: una lista más escrita a mano es una lista
   más que puede divergir. U12.4 comprueba que esa misma lista coincida con el
   `map` de `nginx.conf`. */
function assetsPublicos () {
  const jsonc = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
  return JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, '')).assets.run_worker_first
}

const PUBLICOS = assetsPublicos()
/* Control negativo: un asset que debe seguir cerrado. Sin él, la comprobación
   no distingue «se abrió lo que tocaba» de «se abrió todo». */
const CERRADO = '/assets/isotipo.svg'

async function verificar (host) {
  const base = `https://${host}`
  const fallos = []
  const anota = (ok, texto) => { if (!ok) fallos.push(texto) }

  /* 1 · ¿lo sirve el Worker?
     El discriminador salió midiendo, no de la documentación: el Worker responde
     307 a `/index.html` (`html_handling: auto-trailing-slash` consolida la URL
     canónica) y nginx responde 200. Sirve para saber qué hay detrás de un
     hostname sin poder mirar el panel — los dos caminos van proxiados por
     Cloudflare, así que ni la IP ni la cabecera `Server` lo distinguen. */
  const indice = await fetch(`${base}/index.html`, { redirect: 'manual', headers: NAVEGADOR })
  anota(indice.status === 307,
    `lo sirve otro origen: /index.html devolvió ${indice.status}, el Worker devuelve 307` +
    (indice.status === 200 ? ' (200 es la firma de nginx: ¿sigue enrutado al túnel?)' : ''))

  /* 2 · las cabeceras que promete el contrato, con su valor exacto.
     El valor importa tanto como la presencia: una CSP con una directiva de
     menos protege menos y sería invisible comprobando solo los nombres. */
  const raiz = await fetch(base, { headers: NAVEGADOR })
  anota(raiz.ok, `la raíz devolvió ${raiz.status}`)
  for (const [nombre, esperado] of CONTRATO) {
    const real = raiz.headers.get(nombre)
    if (real === null) anota(false, `falta la cabecera ${nombre}`)
    else anota(real.trim() === esperado, `${nombre} no coincide con el contrato\n      contrato: ${esperado}\n      servido:  ${real.trim()}`)
  }
  anota(/max-age=\d+/.test(raiz.headers.get('strict-transport-security') || ''),
    'sin HSTS (lo pone el borde, no `_headers`)')

  /* 3 · una ruta inexistente devuelve 404 DE VERDAD.
     El soft 404 fue un bug real y costó un ADR arreglarlo; que vuelva por la
     puerta de atrás al cambiar de origen es exactamente lo que hay que impedir. */
  const inexistente = await fetch(`${base}/no-existe-${Date.now().toString(36)}`, { headers: NAVEGADOR })
  anota(inexistente.status === 404, `una ruta inexistente devolvió ${inexistente.status}, no 404`)

  /* 4 · el borde no reescribe el HTML.
     La comprobación que habría cazado el beacon el primer día. Cloudflare
     inyecta solo a peticiones de NAVEGADOR: con un `Accept` genérico el HTML
     sale byte a byte idéntico al desplegado, y con `Accept: text/html` trae
     359 bytes de más. Por eso ningún `curl` a secas lo vio.

     Pedir lo mismo dos veces con distinto `Accept` y comparar el tamaño no
     depende de saber QUÉ inyecta: caza también Rocket Loader, la ofuscación de
     correo o lo que active mañana quien administre la zona. */
  const crudo = await fetch(base, { headers: { accept: '*/*' } })
  const [htmlNavegador, htmlCrudo] = [await raiz.text(), await crudo.text()]
  anota(htmlNavegador.length === htmlCrudo.length,
    `el borde reescribe el HTML según quién lo pida: ${htmlCrudo.length} bytes con ` +
    `Accept:*/* y ${htmlNavegador.length} con Accept:text/html ` +
    `(${htmlNavegador.length - htmlCrudo.length > 0 ? '+' : ''}${htmlNavegador.length - htmlCrudo.length})`)

  /* Y por si algún día inyectara el mismo número de bytes: nada que el
     navegador vaya a DESCARGAR puede venir de fuera del propio origen.
     ADR-0004 autoaloja las fuentes precisamente para no filtrar la IP de los
     visitantes; un tercero metido por el borde contradice esa decisión aunque
     hoy lo pare la CSP.

     «Descargar» y «apuntar» no son lo mismo, y confundirlos da falsos
     positivos: `canonical`, los tres `hreflang` y `og:url` apuntan al apex a
     propósito y no piden nada a nadie. Solo cuentan las etiquetas que provocan
     una petición. */
  const RELS_QUE_DESCARGAN = /^(stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|shortcut icon|apple-touch-icon|manifest)$/i
  const ajenos = [...htmlNavegador.matchAll(/<(script|iframe|img|link)\b([^>]*)>/gi)]
    .filter(([, etiqueta, atributos]) => {
      if (etiqueta.toLowerCase() !== 'link') return true
      const rel = atributos.match(/\brel="([^"]*)"/i)?.[1] ?? ''
      return RELS_QUE_DESCARGAN.test(rel.trim())
    })
    .map(([, , atributos]) => atributos.match(/\b(?:src|href)="(https?:\/\/[^"]+)"/i)?.[1])
    .filter(u => u && new URL(u).host !== host)
  anota(ajenos.length === 0, `el navegador descargaría de terceros: ${[...new Set(ajenos)].join(', ')}`)

  /* 6b · los assets de marca abiertos, y solo esos.
     El camino del Worker aplica esta excepción con código (`worker/index.mjs`)
     y el del contenedor con un `map`; son dos implementaciones distintas de la
     misma regla, así que conviene mirarla donde de verdad importa: en lo
     publicado. Se comprueban las dos mitades —lo abierto y lo cerrado—, porque
     sin la segunda la comprobación no distingue «se abrió lo que tocaba» de
     «se abrió todo». */
  for (const ruta of PUBLICOS) {
    const r = await fetch(base + ruta, { headers: NAVEGADOR })
    const corp = r.headers.get('cross-origin-resource-policy')
    anota(corp === 'cross-origin', `${ruta} debería abrirse a otros orígenes y trae CORP «${corp}»`)
    /* Y sin `Access-Control-Allow-Origin`: se decidió no emitirlo, porque
       aceptarlo en el DAST cegaría esa regla para todo el sitio. */
    anota(r.headers.get('access-control-allow-origin') === null,
      `${ruta} lleva Access-Control-Allow-Origin y no debería`)
  }
  const control = await fetch(base + CERRADO, { headers: NAVEGADOR })
  anota(control.headers.get('cross-origin-resource-policy') === 'same-origin',
    `${CERRADO} no debería estar abierto y trae CORP «${control.headers.get('cross-origin-resource-policy')}»`)

  /* 7 · lo publicado es EL ARTEFACTO QUE ACABAMOS DE CONSTRUIR.
     Esta es la que ata las dos puntas. Todo lo anterior comprueba que el sitio
     está bien; esta comprueba que el sitio es *el nuestro, el de ahora*. Sin
     ella se puede tener todo en verde sobre una versión de hace dos semanas,
     que es literalmente lo que pasó el 2026-07-30.

     Se compara byte a byte contra `dist/` en vez de fiarse del `ETag`: el que
     devuelve Cloudflare no es el hash del contenido —comprobado— así que
     compararlo no diría nada.

     Y se reintenta, porque el borde puede seguir sirviendo la versión anterior
     unos segundos tras desplegar. Reintentar una LECTURA no enmascara nada:
     si nunca converge, falla igual. */
  if (existsSync(DIST)) {
    const esperado = readFileSync(DIST, 'utf8')
    let intentos = 0
    let vivo = htmlCrudo
    while (vivo !== esperado && intentos < 6) {
      intentos++
      await esperar(10_000)
      vivo = await (await fetch(base, { headers: { accept: '*/*' }, cache: 'no-store' })).text()
    }
    anota(vivo === esperado,
      `lo publicado no es el artefacto de este build: ${vivo.length} bytes servidos ` +
      `frente a ${esperado.length} en dist/, tras ${intentos} reintentos`)
    if (vivo === esperado && intentos > 0) {
      console.log(`      (el borde tardó ~${intentos * 10}s en servir la versión nueva)`)
    }
  } else {
    /* Decirlo en voz alta. Una comprobación que se salta en silencio es
       indistinguible de una que pasa, y ese es el patrón que este repositorio
       lleva semanas desmontando. */
    sinDist = true
  }

  return fallos
}

const hosts = process.argv.slice(2).length ? process.argv.slice(2) : CANONICOS
let rotos = 0

console.log(`Verificando ${hosts.length} hostname(s) contra el contrato de \`cloudflare/_headers\`\n`)

for (const host of hosts) {
  let fallos
  try {
    fallos = await verificar(host)
  } catch (e) {
    /* Un hostname que no resuelve es un fallo, no una excepción que se traga el
       script. `www` desapareció de la zona el 2026-07-31 sin que nada avisara. */
    fallos = [`no se pudo alcanzar: ${e.cause?.code ?? e.message}`]
  }
  if (fallos.length === 0) {
    console.log(`  ✅ ${host}`)
  } else {
    rotos++
    console.log(`  ❌ ${host}`)
    for (const f of fallos) console.log(`      · ${f}`)
  }
}

console.log(`\n${hosts.length - rotos}/${hosts.length} hostnames correctos`)

if (sinDist) {
  console.log(
    '\n⚠  No se comparó lo publicado contra `dist/`, que no existe: esta ejecución\n' +
    '   dice que el sitio está bien, pero NO que sea la versión de este build.\n' +
    '   Ejecuta `npm run preparar` antes para que la comprobación sea completa.')
}

process.exit(rotos === 0 ? 0 : 1)
