/* ── Arnés de las pruebas unitarias ──────────────────────────────────────
   Carga el `index.html` REAL, no una copia ni un fixture reducido. El JS vive
   inline (ADR-0003) y no se puede importar, pero sí ejecutarlo en su archivo
   verdadero, y eso elimina de raíz que el test y el artefacto desplegado se
   desvíen.

   Diseño en `docs/04-testing/unit-tests.md`. */

import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const RUTA_HTML = new URL('../../index.html', import.meta.url)
const HTML = readFileSync(RUTA_HTML, 'utf8')

/** Doble de `IntersectionObserver`: jsdom no lo trae. Registra lo observado y
 *  deja que el test dispare las entradas cuando quiera. */
export function crearIOFalso () {
  const instancias = []

  class IntersectionObserverFalso {
    constructor (callback, opciones) {
      this.callback = callback
      this.opciones = opciones
      this.observados = []
      this.desobservados = []
      instancias.push(this)
    }

    observe (el) { this.observados.push(el) }
    unobserve (el) { this.desobservados.push(el) }
    disconnect () {}

    /** Simula que `el` entra en el viewport. */
    disparar (el, isIntersecting = true) {
      this.callback([{ target: el, isIntersecting }], this)
    }
  }

  IntersectionObserverFalso.instancias = instancias
  return IntersectionObserverFalso
}

/**
 * @param {object}   [opciones]
 * @param {string}   [opciones.url]        URL del documento; controla `location.search`.
 * @param {boolean}  [opciones.conIO]      Inyecta el doble de IntersectionObserver.
 * @param {object}   [opciones.sustituir]  `{de, a}` aplicado al HTML antes de parsear.
 * @param {Function} [opciones.alPreparar] Recibe `window` antes de que el script corra.
 */
export function cargarDOM ({
  url = 'https://higerotech.com/',
  conIO = false,
  sustituir = null,
  alPreparar = () => {}
} = {}) {
  let html = HTML

  if (sustituir) {
    /* Guarda contra el test vacuo: si el fuente se reescribe y el reemplazo
       deja de casar, el test debe fallar, no pasar por defecto. Un test que no
       puede fallar es peor que no tenerlo.

       Se comprueba que el patrón CASE, no que el resultado cambie: sustituir
       un texto por sí mismo es legítimo —sirve para afirmar que sigue ahí— y
       comparar los resultados lo daría por fallido. */
    const casa = sustituir.de instanceof RegExp
      ? new RegExp(sustituir.de.source, sustituir.de.flags).test(html)
      : html.includes(sustituir.de)

    if (!casa) {
      throw new Error(`La sustitución no casó con nada: ${sustituir.de}`)
    }

    html = html.replace(sustituir.de, sustituir.a)
  }

  /* Sin esto, una excepción dentro del script inline se traga en silencio y el
     test pasa igual. Es el mecanismo que convierte «el script lanzó» en rojo. */
  const errores = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', e => errores.push(e))

  let IOFalso = null
  const mediaQueries = []

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    virtualConsole,
    beforeParse (win) {
      /* jsdom no implementa matchMedia y la línea 928 de index.html lo llama
         sin guarda. Sin este stub el script muere entero y TODOS los tests
         fallarían por un motivo que no existe en ningún navegador real. */
      win.matchMedia = consulta => {
        const mq = {
          media: consulta,
          matches: false,
          onchange: null,
          _handlers: [],
          addEventListener (_tipo, fn) { this._handlers.push(fn) },
          removeEventListener () {},
          addListener (fn) { this._handlers.push(fn) },
          removeListener () {},
          dispatchEvent () { return false },
          /* El script guarda el objeto que devuelve esta llamada y registra su
             handler ahí. Se coleccionan para que el test pueda alcanzarlo. */
          simularCambio (matches) {
            this.matches = matches
            this._handlers.forEach(fn => fn({ matches, media: this.media }))
          }
        }
        mediaQueries.push(mq)
        return mq
      }

      if (conIO) {
        IOFalso = crearIOFalso()
        win.IntersectionObserver = IOFalso
      }

      alPreparar(win)
    }
  })

  return {
    dom,
    win: dom.window,
    doc: dom.window.document,
    errores,
    IOFalso,
    mediaQueries,
    /* Las declaraciones `function` van al objeto global y se leen como
       `win.setLang`. Las `const`/`let` —CONTACT, IDIOMAS, currentLang— NO están
       en `window`: viven en el ámbito léxico global y solo se alcanzan
       evaluando código en ese ámbito. Ver el documento de diseño. */
    lexico: expr => dom.window.eval(expr)
  }
}

/** Texto del fuente sin parsear, para las aserciones de contrato sobre el archivo. */
export function fuente () {
  return HTML
}
