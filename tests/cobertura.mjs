#!/usr/bin/env node
/* ── Cobertura del script inline de index.html ───────────────────────────
   `node --test --experimental-test-coverage` NO sirve aquí: su reporter solo
   incluye rutas de archivo, y el JS del sitio vive dentro de un <script> que
   jsdom compila bajo la URL del documento. El resultado es un informe que dice
   «100 % de líneas» midiendo únicamente el arnés — verde y vacío, que es la
   peor combinación posible.

   Los datos crudos SÍ existen: V8 registra el script inline con contadores por
   rango. Este script los recoge, los mapea al texto del <script> —los offsets
   coinciden byte a byte con él— y traduce a números de línea de `index.html`.

   Uso:  npm run coverage
   Ver:  docs/04-testing/unit-tests.md §Cobertura */

import { readFileSync, readdirSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR_V8 = join(RAIZ, 'coverage', 'v8')
const ORIGEN_DOC = 'https://higerotech.com'

/* El umbral se fija sobre FUNCIONES y no sobre líneas, por dos motivos:

   1. La cifra de líneas es una cota inferior conocida —las pruebas que mutan
      el fuente quedan fuera del recuento—, así que gatear sobre ella castigaría
      un artefacto de la medición y no una carencia de pruebas.
   2. «Función nunca ejecutada» es un hecho binario y accionable; «94,7 % de
      líneas» invita a discutir el decimal.

   Se fija en 100 y no en el 80 que pide el Gate 2 porque hoy estamos en 100:
   bajarlo sería reservar sitio para dejar de probar. Con 17 funciones, tolerar
   «una sin cubrir» equivale a un 94 %, y esa función sin probar sería
   precisamente la que nadie mira. Añadir una función obliga a añadir su prueba,
   que es exactamente el trabajo que se le pide a un gate. */
const UMBRAL_FUNCIONES = Number(process.env.UMBRAL_FUNCIONES ?? 100)

// ── 1. Ejecutar el suite recogiendo cobertura de V8 ──────────────────────
if (existsSync(DIR_V8)) rmSync(DIR_V8, { recursive: true, force: true })
mkdirSync(DIR_V8, { recursive: true })

const ejecucion = spawnSync(
  process.execPath,
  ['--test', 'tests/unit/**/*.test.mjs'],
  { cwd: RAIZ, env: { ...process.env, NODE_V8_COVERAGE: DIR_V8 }, encoding: 'utf8' }
)

const resumen = (ejecucion.stdout || '').match(/^ℹ (tests|pass|fail) \d+$/gm) || []
console.log(resumen.join('\n'))

if (ejecucion.status !== 0) {
  console.error('\nEl suite falló; no tiene sentido informar cobertura.')
  console.error(ejecucion.stdout)
  process.exit(ejecucion.status ?? 1)
}

// ── 2. Localizar el <script> inline y su desplazamiento de líneas ────────
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8')
const enScript = html.match(/<script>([\s\S]*?)<\/script>/)
if (!enScript) throw new Error('no se encontró el <script> inline en index.html')

const fuente = enScript[1]
const lineaBase = html.slice(0, enScript.index + '<script>'.length).split('\n').length - 1

// ── 3. Fundir los contadores de todas las instancias de jsdom ────────────
/* Cada test construye un JSDOM nuevo, así que V8 compila el mismo script una
   vez por test y hay tantas instancias como cargas.

   Se funde por MÁXIMO y no sumando sub-rangos, porque V8 solo emite un
   sub-rango cuando un bloque NO se ejecutó: su ausencia en una instancia
   significa «cubierto ahí», no cero. Sumando claves de rango, un bloque que
   se ejecuta en la instancia A y no en la B se quedaría en 0 —la A no aporta
   ninguna entrada que sumar— y aparecería como no cubierto. Por eso cada
   instancia calcula su propio mapa de bytes y luego se combinan al máximo. */

let mapaBytes = null
const porFuncion = new Map() // solo ranges[0] de cada función
let descartados = 0
let instancias = 0

for (const archivo of readdirSync(DIR_V8)) {
  const datos = JSON.parse(readFileSync(join(DIR_V8, archivo), 'utf8'))

  for (const script of datos.result) {
    if (!script.url.startsWith(ORIGEN_DOC)) continue
    if (!script.functions.length) continue

    /* Algunos tests cargan el HTML con el fuente MUTADO a propósito (U8.2
       sustituye el literal de CONTACT). Ese script es más largo, así que sus
       offsets no casan con los del fuente original y fundirlos corrompería el
       mapa: un rango con count 0 mal alineado marcaría como no cubierto algo
       que sí lo está. Se descartan y se avisa, de modo que el número informado
       sea una cota INFERIOR y nunca un falso verde. */
    const finTopLevel = script.functions[0].ranges[0].endOffset
    if (finTopLevel !== fuente.length) { descartados++; continue }

    instancias++

    // Mapa de bytes de ESTA instancia: los rangos internos pisan a los externos.
    const local = new Int32Array(fuente.length)
    const rangos = []

    for (const fn of script.functions) {
      const propio = fn.ranges[0]
      const claveFn = `${fn.functionName}|${propio.startOffset}|${propio.endOffset}`
      const yaVista = porFuncion.get(claveFn)
      if (yaVista) yaVista.count += propio.count
      else porFuncion.set(claveFn, {
        nombre: fn.functionName, inicio: propio.startOffset, count: propio.count
      })

      rangos.push(...fn.ranges)
    }

    rangos.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset)
    for (const r of rangos) {
      local.fill(r.count, r.startOffset, Math.min(r.endOffset, fuente.length))
    }

    if (!mapaBytes) mapaBytes = local
    else for (let i = 0; i < fuente.length; i++) {
      if (local[i] > mapaBytes[i]) mapaBytes[i] = local[i]
    }
  }
}

if (!mapaBytes) {
  console.error(`No se registró cobertura para ${ORIGEN_DOC}. ¿Cambió la URL del arnés?`)
  process.exit(1)
}

// ── 4. Líneas ────────────────────────────────────────────────────────────
const cuentas = mapaBytes
const lineas = fuente.split('\n')
let offset = 0
const sinCubrir = []
let ejecutables = 0
let cubiertas = 0

for (let i = 0; i < lineas.length; i++) {
  const texto = lineas[i]
  const podado = texto.trim()
  const inicio = offset
  offset += texto.length + 1

  // Fuera: vacías, comentarios de bloque y de línea, y cierres sueltos.
  if (!podado || podado.startsWith('//') || podado.startsWith('/*') ||
      podado.startsWith('*') || /^[}\]);,]*$/.test(podado)) continue

  ejecutables++

  let tocada = false
  for (let j = inicio; j < inicio + texto.length; j++) {
    if (fuente[j].trim() && cuentas[j] > 0) { tocada = true; break }
  }

  if (tocada) cubiertas++
  else sinCubrir.push({ linea: lineaBase + i + 1, texto: podado.slice(0, 68) })
}

// ── 6. Funciones ─────────────────────────────────────────────────────────
const lista = [...porFuncion.values()].sort((a, b) => a.inicio - b.inicio)
const ejecutadas = lista.filter(f => f.count > 0)

const lineaDe = off => lineaBase + fuente.slice(0, off).split('\n').length

const pct = (a, b) => b === 0 ? 100 : (a / b) * 100
const pctFunciones = pct(ejecutadas.length, lista.length)
const pctLineas = pct(cubiertas, ejecutables)

// ── 7. Informe ───────────────────────────────────────────────────────────
console.log('\nCobertura del <script> inline de index.html')
console.log(`  líneas    ${pctLineas.toFixed(1).padStart(6)} %   (${cubiertas}/${ejecutables} ejecutables)`)
console.log(`  funciones ${pctFunciones.toFixed(1).padStart(6)} %   (${ejecutadas.length}/${lista.length})`)

if (descartados) {
  console.log(
    `\n  Nota: ${descartados} ejecuciones descartadas por cargar el fuente mutado ` +
    '(U8.2 sustituye el literal de CONTACT y desplaza los offsets).\n' +
    '  Lo que esas pruebas cubren no cuenta aquí: el número es una cota inferior.'
  )
}

const noEjecutadas = lista.filter(f => f.count === 0)
if (noEjecutadas.length) {
  console.log('\n  Funciones nunca ejecutadas:')
  for (const f of noEjecutadas) {
    console.log(`    index.html:${lineaDe(f.inicio)}  ${f.nombre || '(anónima)'}`)
  }
}

if (sinCubrir.length) {
  console.log('\n  Líneas sin cubrir:')
  for (const l of sinCubrir) console.log(`    index.html:${l.linea}  ${l.texto}`)
}

if (pctFunciones < UMBRAL_FUNCIONES) {
  console.error(
    `\nPor debajo del umbral: ${pctFunciones.toFixed(1)} % < ${UMBRAL_FUNCIONES} % de funciones.`
  )
  process.exit(1)
}

console.log(`\nUmbral de funciones (${UMBRAL_FUNCIONES} %) superado.`)
