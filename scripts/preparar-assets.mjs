#!/usr/bin/env node
/* ── Prepara `dist/` para el Worker ──────────────────────────────────────
   Copia a `dist/` exactamente lo que se publica, y nada más.

   Por qué una lista de INCLUSIÓN y no `.assetsignore`:

   wrangler admite un archivo de exclusiones, y sería más corto apuntar el
   Worker a la raíz del repositorio e ir tachando `node_modules`, `docs`,
   `tests`, `.git`… Pero una lista de exclusión falla en silencio hacia el lado
   peligroso: el día que aparezca un archivo nuevo —un volcado, un `.env` de
   pruebas, una copia de seguridad— se publica solo, porque nadie se acordó de
   añadirlo.

   El `Dockerfile` usa lista de inclusión desde el principio y por eso nunca se
   ha colado nada en la imagen. Aquí se mantiene el mismo criterio, y la prueba
   U12.3 comprueba que ambas listas digan lo mismo: si alguien añade un archivo
   al Dockerfile y se olvida de aquí, el sitio del Worker saldría incompleto.

   Uso:  npm run preparar                                                    */

import { cpSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DESTINO = join(RAIZ, 'dist')

/* La misma lista que copia el Dockerfile, más el `_headers` del Worker.
   Mantener en orden alfabético para que el diff sea legible. */
export const PUBLICABLES = [
  '404.html',
  'assets',
  'index.html',
  'robots.txt',
  'sitemap.xml'
]

if (existsSync(DESTINO)) rmSync(DESTINO, { recursive: true, force: true })
mkdirSync(DESTINO, { recursive: true })

for (const nombre of PUBLICABLES) {
  const origen = join(RAIZ, nombre)
  if (!existsSync(origen)) {
    console.error(`No existe «${nombre}», que la lista dice que se publica.`)
    process.exit(1)
  }
  cpSync(origen, join(DESTINO, nombre), { recursive: true })
}

/* `_headers` no se sirve: lo consume el Worker para aplicar las cabeceras. */
cpSync(join(RAIZ, 'cloudflare', '_headers'), join(DESTINO, '_headers'))

const tam = PUBLICABLES.reduce((n, f) => {
  const p = join(DESTINO, f)
  return n + (statSync(p).isDirectory() ? 0 : statSync(p).size)
}, 0)

console.log(`dist/ preparado — ${PUBLICABLES.length} entradas + _headers (${Math.round(tam / 1024)} KB sin contar assets/)`)
