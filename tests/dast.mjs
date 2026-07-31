#!/usr/bin/env node
/* ── DAST: escaneo pasivo con ZAP baseline ───────────────────────────────
   Un contenedor escaneando a otro. Se usa la imagen oficial de ZAP por Docker
   y no la acción de GitHub, para que el comando sea EL MISMO en local y en CI:
   un gate que solo se puede ejecutar en el runner se depura a ciegas.

   Tampoco añade dependencias npm, así que el gate SCA no se entera.

   `zap-baseline.py` sale con código 2 ante cualquier WARN. Todo lo que no
   esté en `.zap/rules.tsv` como IGNORE rompe el build, así que ese archivo es
   la lista completa y explícita de lo aceptado. Ver `docs/04-testing/dast.md`.

   `--activo` cambia a `zap-full-scan.py`, que **ataca** en vez de observar.
   No forma parte del gate — ver `docs/04-testing/dast.md` §Validación.

   Uso:  npm run dast                  (PUERTO apunta a otro puerto del host)
         npm run dast -- --activo      (escaneo activo, bajo demanda)         */

import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const TRABAJO = join(RAIZ, 'coverage', 'zap')
const PUERTO = process.env.PUERTO || '80'

/* `host.docker.internal` con `--add-host` funciona igual en Docker Desktop y
   en los runners de Linux; `--network host` no. */
const BASE = `http://host.docker.internal:${PUERTO}`

/* Dos objetivos, no uno.

   Al validar el gate se midió desde el log de nginx qué pedía ZAP de verdad:
   8 URLs —la home, robots, sitemap, imágenes y fuentes— y **nunca la página
   404**. El spider solo sigue enlaces, y a `/404.html` no apunta ninguno: es
   nginx quien la sirve ante una ruta inexistente. Era un punto ciego real,
   sobre una página que los visitantes sí ven.

   Que las cabeceras y la ausencia de versión en el 404 ya las comprueben E9.2
   y E9.3 no lo cubre: esas son dos aserciones concretas, y aquí pasan 64
   reglas pasivas. */
/* Se lee de argv y no de una variable de entorno: `ACTIVO=1 npm run …` no es
   portable a Windows sin dependencias añadidas, y `npm run dast -- --activo`
   funciona igual en los dos sitios. */
const ACTIVO = process.argv.includes('--activo')

const OBJETIVOS = [
  { nombre: 'sitio', url: BASE },
  { nombre: 'pagina-404', url: `${BASE}/404.html` }
]

if (existsSync(TRABAJO)) rmSync(TRABAJO, { recursive: true, force: true })
mkdirSync(TRABAJO, { recursive: true })
copyFileSync(join(RAIZ, '.zap', 'rules.tsv'), join(TRABAJO, 'rules.tsv'))

let codigo = 0

for (const { nombre, url } of OBJETIVOS) {
  console.log(`\n── ZAP ${ACTIVO ? 'ACTIVO (ataca)' : 'baseline (pasivo)'} sobre ${url} ──\n`)

  const r = spawnSync('docker', [
    'run', '--rm',
    '--add-host=host.docker.internal:host-gateway',
    '-v', `${TRABAJO}:/zap/wrk/:rw`,
    'ghcr.io/zaproxy/zaproxy:stable',
    ACTIVO ? 'zap-full-scan.py' : 'zap-baseline.py',
    '-t', url,
    '-c', 'rules.tsv',
    '-J', `${nombre}.json`,
    '-r', `${nombre}.html`
  ], { stdio: 'inherit' })

  if (r.error) {
    console.error(`\nNo se pudo ejecutar docker: ${r.error.message}`)
    process.exit(1)
  }

  // Se ejecutan todos los objetivos aunque uno falle: interesa el cuadro entero.
  codigo = Math.max(codigo, r.status ?? 1)
}

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
