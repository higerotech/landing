#!/usr/bin/env node
/* ── DAST: escaneo pasivo con ZAP baseline ───────────────────────────────
   Un contenedor escaneando a otro. Se usa la imagen oficial de ZAP por Docker
   y no la acción de GitHub, para que el comando sea EL MISMO en local y en CI:
   un gate que solo se puede ejecutar en el runner se depura a ciegas.

   Tampoco añade dependencias npm, así que el gate SCA no se entera.

   `zap-baseline.py` sale con código 2 ante cualquier WARN. Todo lo que no
   esté en `.zap/rules.tsv` como IGNORE rompe el build, así que ese archivo es
   la lista completa y explícita de lo aceptado. Ver `docs/04-testing/dast.md`.

   Uso:  npm run dast          (PUERTO para apuntar a otro puerto del host)  */

import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const TRABAJO = join(RAIZ, 'coverage', 'zap')
const PUERTO = process.env.PUERTO || '80'

/* `host.docker.internal` con `--add-host` funciona igual en Docker Desktop y
   en los runners de Linux; `--network host` no. */
const OBJETIVO = `http://host.docker.internal:${PUERTO}`

if (existsSync(TRABAJO)) rmSync(TRABAJO, { recursive: true, force: true })
mkdirSync(TRABAJO, { recursive: true })
copyFileSync(join(RAIZ, '.zap', 'rules.tsv'), join(TRABAJO, 'rules.tsv'))

console.log(`ZAP baseline sobre ${OBJETIVO}\n`)

const r = spawnSync('docker', [
  'run', '--rm',
  '--add-host=host.docker.internal:host-gateway',
  '-v', `${TRABAJO}:/zap/wrk/:rw`,
  'ghcr.io/zaproxy/zaproxy:stable',
  'zap-baseline.py',
  '-t', OBJETIVO,
  '-c', 'rules.tsv',
  '-J', 'informe.json',
  '-r', 'informe.html'
], { stdio: 'inherit' })

if (r.error) {
  console.error(`\nNo se pudo ejecutar docker: ${r.error.message}`)
  process.exit(1)
}

const codigo = r.status ?? 1

console.log(`\nInformes en ${TRABAJO}`)

/* 0 = limpio · 1 = FAIL · 2 = WARN · 3 = error de ejecución.
   Los tres últimos rompen el build a propósito: un aviso nuevo es un hallazgo
   nuevo, y decidir que no importa se hace añadiéndolo a rules.tsv con su
   motivo, no ignorándolo en silencio. */
if (codigo === 0) console.log('Sin hallazgos fuera de los aceptados en .zap/rules.tsv')
else if (codigo === 2) console.error('Hay avisos NUEVOS: revísalos y, si se aceptan, documéntalos en .zap/rules.tsv')
else if (codigo === 1) console.error('Hay hallazgos marcados como FAIL.')
else console.error(`ZAP terminó con código ${codigo}.`)

process.exit(codigo)
