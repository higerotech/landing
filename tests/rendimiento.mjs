#!/usr/bin/env node
/* ── Presupuesto de rendimiento con Lighthouse ───────────────────────────
   Comprueba las dos métricas que el charter declara como objetivo:
   LCP < 2,5 s en 3G lento y menos de 350 KB de primera carga.

   Tres decisiones que no son cosméticas:

   1. **Throttling real (`devtools`), no simulado.** El método simulado modela
      el grafo de dependencias y aquí daba LCP de 5,26 s cuando el navegador
      medía 1,6 s. Casi se registra como «presupuesto incumplido» algo que se
      cumple: la diferencia entre los dos métodos era de 3,6 s.

   2. **3G lento de verdad, no el preset por defecto.** El preset móvil de
      Lighthouse es Slow 4G (1638 kbps / 150 ms). El charter dice 3G lento, que
      es 400 kbps / 400 ms. Medir con el preset y dar el presupuesto por bueno
      sería verificar otra condición distinta de la declarada.

   3. **Mediana de varias ejecuciones.** Medido: 2404 / 2673 / 2491 / 2478 ms
      para la misma página. Un gate sobre una sola ejecución sería una moneda al
      aire. Ver `docs/04-testing/rendimiento.md`.

   Uso:  npm run perf          (BASE_URL para apuntar a otro sitio)         */

import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from '@playwright/test'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(RAIZ, 'coverage', 'lighthouse')
const BASE_URL = process.env.BASE_URL || 'http://localhost'
const EJECUCIONES = Number(process.env.PERF_RUNS ?? 3)

/* 3G lento, como lo define DevTools. */
const RED_3G = { rttMs: 400, throughputKbps: 400, cpuSlowdownMultiplier: 4 }

/* Umbrales. Los dos primeros salen del charter §Métricas de éxito; los demás
   se fijan por debajo de lo medido, con margen para el ruido, no en el número
   exacto que da hoy: un gate clavado en la medición actual falla al primer
   cambio inocuo. */
const PRESUPUESTO = {
  lcpMs: Number(process.env.PRESUPUESTO_LCP_MS ?? 2500),
  pesoKB: Number(process.env.PRESUPUESTO_PESO_KB ?? 350),
  categorias: { performance: 90, accessibility: 100, 'best-practices': 95, seo: 100 }
}

const mediana = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const kb = bytes => Math.round(bytes / 1024)

if (existsSync(SALIDA)) rmSync(SALIDA, { recursive: true, force: true })
mkdirSync(SALIDA, { recursive: true })

console.log(`Lighthouse sobre ${BASE_URL} — 3G lento (${RED_3G.throughputKbps} kbps, ` +
            `RTT ${RED_3G.rttMs} ms, CPU ×${RED_3G.cpuSlowdownMultiplier}), ` +
            `${EJECUCIONES} ejecuciones\n`)

const informes = []

for (let i = 1; i <= EJECUCIONES; i++) {
  const destino = join(SALIDA, `run-${i}.json`)
  const r = spawnSync(process.execPath, [
    join(RAIZ, 'node_modules', 'lighthouse', 'cli', 'index.js'),
    BASE_URL,
    '--quiet',
    '--output=json', `--output-path=${destino}`,
    '--throttling-method=devtools',
    `--throttling.rttMs=${RED_3G.rttMs}`,
    `--throttling.throughputKbps=${RED_3G.throughputKbps}`,
    `--throttling.cpuSlowdownMultiplier=${RED_3G.cpuSlowdownMultiplier}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage'
  ], {
    cwd: RAIZ,
    // Reutiliza el Chromium que ya descargó Playwright: una sola copia.
    env: { ...process.env, CHROME_PATH: chromium.executablePath() },
    encoding: 'utf8'
  })

  if (!existsSync(destino)) {
    console.error(`La ejecución ${i} no produjo informe.`)
    console.error((r.stderr || '').split('\n').slice(0, 8).join('\n'))
    process.exit(1)
  }

  const informe = JSON.parse(readFileSync(destino, 'utf8'))
  informes.push(informe)

  console.log(
    `  run ${i}  LCP ${String(Math.round(informe.audits['largest-contentful-paint'].numericValue)).padStart(5)} ms` +
    `   perf ${Math.round(informe.categories.performance.score * 100)}`
  )
}

const lcp = mediana(informes.map(i => i.audits['largest-contentful-paint'].numericValue))
const peso = mediana(informes.map(i => i.audits['total-byte-weight'].numericValue))
const cats = Object.fromEntries(
  Object.keys(PRESUPUESTO.categorias).map(c => [
    c, mediana(informes.map(i => Math.round((i.categories[c]?.score ?? 0) * 100)))
  ])
)

const fallos = []
const linea = (etiqueta, valor, limite, ok, unidad = '') => {
  console.log(`  ${etiqueta.padEnd(16)} ${String(valor).padStart(6)}${unidad}` +
              `  ${ok ? '≤' : '>'} ${limite}${unidad}  ${ok ? 'OK' : 'FALLA'}`)
  if (!ok) fallos.push(`${etiqueta}: ${valor}${unidad} contra un presupuesto de ${limite}${unidad}`)
}

console.log('\nMedianas frente al presupuesto:')
linea('LCP', Math.round(lcp), PRESUPUESTO.lcpMs, lcp <= PRESUPUESTO.lcpMs, ' ms')
linea('peso total', kb(peso), PRESUPUESTO.pesoKB, kb(peso) <= PRESUPUESTO.pesoKB, ' KB')
for (const [c, minimo] of Object.entries(PRESUPUESTO.categorias)) {
  const v = cats[c]
  console.log(`  ${c.padEnd(16)} ${String(v).padStart(6)}   ≥ ${minimo}   ${v >= minimo ? 'OK' : 'FALLA'}`)
  if (v < minimo) fallos.push(`${c}: ${v} por debajo de ${minimo}`)
}

if (fallos.length) {
  console.error('\nPresupuesto incumplido:')
  fallos.forEach(f => console.error('  · ' + f))
  process.exit(1)
}

console.log('\nPresupuesto cumplido.')
