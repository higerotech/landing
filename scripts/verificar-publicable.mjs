#!/usr/bin/env node
/* ── ¿Se puede publicar esto? ─────────────────────────────────────────────
   Falla si un archivo que se publica lleva un marcador sin resolver.

   El marcador es la convención de este repositorio para una decisión
   pendiente: `<TODO: qué falta>`. En un documento de `docs/` es una nota de
   trabajo perfectamente válida. En una página que se sirve a un visitante es
   otra cosa — y en las páginas legales es, concretamente, un documento que no
   cumple su función:

     El responsable del tratamiento es <TODO: razón social>, RIF <TODO>…

   Una política de privacidad sin responsable identificado no identifica a
   nadie, y unos términos de uso sin titular no obligan a nada. No es un detalle
   cosmético: es la diferencia entre un documento y un borrador con estilo.

   POR QUÉ AQUÍ Y NO EN `npm test`. El workflow de despliegue tiene escrita la
   razón, y vale para esto: «un CI que falla por diseño enseña a ignorar los
   fallos». Si estas páginas dejaran las unitarias en rojo hasta que alguien
   rellene un RIF, el rojo dejaría de significar algo en una semana. El bloqueo
   va donde el fallo es accionable y no se puede rodear: el punto exacto en que
   el sitio se empaqueta para publicarse.

   DÓNDE MUERDE, y dónde no:

   - `npm run preparar` lo llama antes de copiar nada, y ese comando es el paso
     previo a `wrangler deploy` en el workflow de despliegue. El camino canónico
     a producción queda cerrado.
   - El camino de contingencia (la imagen de nginx) se levanta a mano, así que
     no hay CI que lo intercepte. Para eso está `npm run verificar:publicable`,
     que es este mismo archivo invocado directamente. Queda documentado en
     `docs/05-deployment/deployment.md`.
   - U14 comprueba que este verificador FUNCIONE, no que hoy pase. Un guardia
     que no se puede probar es un guardia decorativo.

   Uso:  npm run verificar:publicable                                        */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

/* `PUBLICABLES` NO se importa aquí arriba. `preparar-assets.mjs` importa este
   archivo para no empaquetar borradores, así que un import estático en sentido
   contrario cerraría un ciclo entre los dos módulos. Quien llama pasa la lista;
   el modo CLI la carga con un import dinámico, cuando ya no hay ciclo posible. */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

/* Las dos formas en que el marcador llega a un archivo publicado: tal cual —en
   un comentario HTML, en un CSS, en el JS— y escapado, que es como aparece
   cuando el marcador es TEXTO VISIBLE de la página. El segundo es el que
   importa de verdad, y es el que un `grep '<TODO'` a secas no encuentra. */
const MARCADORES = [
  { nombre: 'marcador visible', re: /&lt;\s*TODO\b[^&]*(?:&gt;)?/gi },
  { nombre: 'marcador en el fuente', re: /<\s*TODO\b[^>]*>?/gi }
]

/** Extensiones que un visitante recibe y puede leer. */
const SERVIDOS = /\.(html|css|js|txt|xml|json|svg)$/i

/**
 * Expande la lista de inclusión a los archivos que un visitante puede leer.
 * @param {string[]} publicables Entradas de `PUBLICABLES`: archivos o directorios.
 */
export function archivosPublicables (publicables) {
  const salida = []

  const recorrer = rel => {
    const abs = join(RAIZ, rel)
    if (!existsSync(abs)) return

    if (statSync(abs).isDirectory()) {
      for (const hijo of readdirSync(abs)) recorrer(`${rel}/${hijo}`)
    } else if (SERVIDOS.test(rel)) {
      salida.push(rel)
    }
  }

  for (const entrada of publicables) recorrer(entrada)
  return salida
}

/**
 * Busca marcadores sin resolver en los archivos que se publican.
 * @param {object} opciones
 * @param {string[]} opciones.archivos Rutas relativas a la raíz del repo.
 * @param {(rel: string) => string} [opciones.leer] Inyectable para las pruebas.
 * @returns {{archivo: string, linea: number, tipo: string, texto: string}[]}
 */
export function buscarPendientes ({ archivos, leer } = {}) {
  const lista = archivos ?? []
  const leerArchivo = leer ?? (rel => readFileSync(join(RAIZ, rel), 'utf8'))
  const hallazgos = []

  for (const rel of lista) {
    const lineas = leerArchivo(rel).split('\n')

    lineas.forEach((linea, i) => {
      for (const { nombre, re } of MARCADORES) {
        for (const m of linea.matchAll(re)) {
          hallazgos.push({
            archivo: rel,
            linea: i + 1,
            tipo: nombre,
            texto: m[0].replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 70)
          })
        }
      }
    })
  }

  return hallazgos
}

async function informar () {
  const { PUBLICABLES } = await import('./preparar-assets.mjs')
  const pendientes = buscarPendientes({ archivos: archivosPublicables(PUBLICABLES) })

  if (pendientes.length === 0) {
    console.log('Nada sin resolver: los archivos publicables no llevan marcadores.')
    return 0
  }

  console.error(`\n${pendientes.length} marcador(es) sin resolver en archivos que se publican:\n`)

  let archivoActual = null
  for (const p of pendientes) {
    if (p.archivo !== archivoActual) {
      archivoActual = p.archivo
      console.error(`  ${p.archivo}`)
    }
    console.error(`    línea ${String(p.linea).padStart(4)}  ${p.texto}`)
  }

  console.error(`
No se publica con marcadores sin resolver. Si son las páginas legales, lo que
falta es la identificación de la entidad —razón social, RIF y domicilio— y la
decisión sobre la institución arbitral: sin eso, una política de privacidad no
identifica a su responsable y unos términos de uso no obligan a nadie.

Si un marcador concreto es legítimo en una página publicada, entonces no debería
escribirse con la forma <TODO: …>, que en este repositorio significa «decisión
pendiente». Reescríbelo, no relajes el verificador.
`)

  return 1
}

/* Solo verifica si se INVOCA. Importarlo para usar `buscarPendientes` no debe
   imprimir ni salir — es el mismo cuidado que `preparar-assets.mjs` tuvo que
   aprender cuando construía `dist/` de refilón al ser importado. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  /* Sin `await` en el nivel superior: un `process.exit()` dentro de una espera
     de nivel superior deja el módulo sin asentar, Node avisa de ello y el código
     de salida se vuelve poco fiable — medido, no supuesto. */
  informar().then(codigo => process.exit(codigo))
}
