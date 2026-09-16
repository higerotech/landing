/* U11 · OWASP Top 10 — premisas y contratos
   Cubre los huecos de la matriz que no necesitan HTTP. Los que sí lo necesitan
   están en `tests/e2e/e9-owasp.spec.mjs`.

   La idea que ordena este archivo: en el mapeo OWASP hay categorías marcadas
   como **«No aplica»**, y esa etiqueta descansa en una premisa —no hay
   autenticación, no hay entradas de usuario— que nadie comprobaba. Este
   repositorio ya vio caducar una premisa así: el gate SCA estaba en ✅ «por
   ausencia de dependencias» hasta que entró jsdom y la ausencia dejó de ser
   cierta sin que el ✅ se moviera.

   Estas pruebas convierten esas premisas en algo que falla cuando dejan de ser
   verdad. Ver `.ai-dlc/owasp-mapping.md` §Matriz de verificación. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cargarDOM, fuente, fuenteJS, estaInstrumentado } from '../helpers/cargar-dom.mjs'

const leer = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

describe('U11 · A01 y A07 — la premisa de «No aplica»', () => {
  test('U11.1 · no hay superficie de autenticación ni de entrada', () => {
    /* A01 (Broken Access Control) y A07 (Auth Failures) están marcados «No
       aplica» porque no hay recursos protegidos, ni identidad, ni formularios.
       El día que aparezca un formulario de contacto o un área de clientes, esa
       clasificación deja de valer — y esta prueba es la que lo dirá. */
    const { doc } = cargarDOM()

    const superficie = {
      formularios: doc.querySelectorAll('form').length,
      entradas: doc.querySelectorAll('input, textarea, select').length,
      contraseñas: doc.querySelectorAll('[type="password"]').length,
      subidas: doc.querySelectorAll('[type="file"]').length,
      contenteditable: doc.querySelectorAll('[contenteditable]').length
    }

    assert.deepEqual(
      superficie,
      { formularios: 0, entradas: 0, contraseñas: 0, subidas: 0, contenteditable: 0 },
      'apareció superficie de entrada: A01 y A07 dejan de ser «No aplica» y hay que reclasificarlos'
    )
  })

  test('U11.2 · no se leen ni escriben cookies', () => {
    /* Refuerza A01/A07 y también la clasificación de datos: el sitio no
       identifica a nadie. `localStorage` sí se usa, para el idioma, y eso está
       documentado y es dato no personal. */
    for (const archivo of ['index.html', '404.html', 'assets/sitio.js']) {
      assert.ok(
        !/document\.cookie/.test(leer(archivo)),
        `${archivo} manipula cookies: revisar la clasificación de datos y A01/A07`
      )
    }
  })
})

describe('U11 · A05 — inyección por el único parámetro que se lee', () => {
  test('U11.3 · un payload en ?lang no llega al DOM', () => {
    /* `?lang` es la ÚNICA entrada externa que el sitio interpreta. El threat
       model lo registra como T12 y da por verificación «`?lang=<script>` cae a
       es», pero esa comprobación no existía como prueba. Aquí está. */
    const payload = '<script>alert(1)</script>'
    const { doc, win } = cargarDOM({
      url: `https://higerotech.com/?lang=${encodeURIComponent(payload)}`
    })

    assert.equal(doc.documentElement.lang, 'es', 'un valor no permitido debe caer a es')
    assert.equal(win.idiomaInicial(), 'es')
    assert.ok(
      !doc.body.innerHTML.includes('alert(1)'),
      'el payload no debe aparecer en el DOM'
    )
    assert.equal(doc.querySelectorAll('script').length, 2, 'no debe haberse inyectado un <script>')
  })

  test('U11.4 · el idioma solo puede tomar los valores de la lista', () => {
    const { win, doc, lexico } = cargarDOM()
    const permitidos = lexico('IDIOMAS')

    for (const intento of ['fr', 'ES', '', 'es-ES', '../es', 'javascript:1']) {
      win.setLang(intento)
      assert.ok(
        permitidos.includes(doc.documentElement.lang),
        `setLang(${JSON.stringify(intento)}) dejó lang fuera de la lista permitida`
      )
    }
  })
})

describe('U11 · A05 — la CSP ya no lleva `unsafe-inline` en script-src', () => {
  test('U11.8 · no queda ni un script inline ejecutable ni un manejador on*=', {
    skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
  }, () => {
    /* ADR-0007 quitó `'unsafe-inline'` de `script-src`, y eso convierte en
       contrato lo que antes era una preferencia: en el marcado no puede quedar
       JavaScript.

       Importa porque el fallo es SILENCIOSO y total. El navegador bloquea el
       bloque inline sin romper nada más, deja un aviso en una consola que nadie
       mira, y como `.reveal` está en `opacity: 0` esperando que el JS le añada
       `.in`, el resultado es una página en blanco. Es T17 otra vez, con la CSP
       como causa en lugar de una excepción.

       E5.1 también lo vería, pero en un navegador y en el nivel E2E. Esto falla
       en la unitaria, que es donde se mira primero.

       El `<script type="application/ld+json">` NO cuenta, y por eso se filtra
       por `type`: es un bloque de datos, el parser no lo prepara como script y
       la CSP no lo evalúa. */
    const TIPOS_DE_DATOS = ['application/ld+json', 'application/json', 'text/template']

    /* Sin quitar los comentarios, esta prueba se dispara con la prosa que
       explica la decisión: los comentarios de index.html mencionan `<script>`
       y un falso positivo aquí acabaría con alguien borrando la explicación
       para poner el test en verde. */
    const sinComentarios = texto => texto.replace(/<!--[\s\S]*?-->/g, '')

    for (const archivo of ['index.html', '404.html']) {
      const texto = sinComentarios(leer(archivo))

      for (const [etiqueta, atributos] of texto.matchAll(/<script([^>]*)>/gi)) {
        if (/\bsrc\s*=/i.test(atributos)) continue // externo: lo cubre 'self'

        const tipo = (atributos.match(/type\s*=\s*["']([^"']+)["']/i) ?? [])[1]
        assert.ok(
          tipo && TIPOS_DE_DATOS.includes(tipo.toLowerCase()),
          `${archivo} tiene un <script> inline ejecutable (${etiqueta.trim()}): la CSP lo ` +
          'bloqueará y la página se queda en blanco. Muévelo a assets/sitio.js'
        )
      }

      /* Los manejadores del marcado también son script inline para la CSP, y ni
         `'unsafe-inline'` sin `'unsafe-hashes'` los habría salvado. */
      const manejadores = [...texto.matchAll(/\s(on[a-z]+)\s*=\s*["']/gi)].map(m => m[1])
      assert.deepEqual(
        manejadores, [],
        `${archivo} tiene manejadores de evento en el marcado: la CSP los bloquea`
      )
    }
  })
})

describe('U11 · A08 y A03 — integridad y procedencia', () => {
  test('U11.5 · no se CARGA ningún recurso de otro origen', () => {
    /* A08 dice que no hace falta SRI «porque todo es same-origin». Esa frase es
       una premisa, no un control: si alguien añade un `<script src>` de un CDN,
       deja de ser cierta y SRI pasa a ser obligatorio.

       Se miran solo los elementos que CARGAN recursos. Un `<a href>` a otro
       dominio no trae código a la página: el botón de WhatsApp apunta a
       `wa.me` y eso es navegación, no ejecución. La primera versión de esta
       prueba los confundía y fallaba por el CTA. De que los enlaces externos
       lleven `noopener noreferrer` se ocupa E6.2.

       Se comprueba sobre el marcado y no sobre la red para que falle en la
       unitaria, no solo en E5.4. */
    const { doc } = cargarDOM()
    const CARGAN = 'script[src], img[src], iframe[src], embed[src], object[data], ' +
                   'source[src], video[src], audio[src], track[src], ' +
                   'link[rel="stylesheet"], link[rel="preload"], link[rel="modulepreload"]'

    const externos = [...doc.querySelectorAll(CARGAN)]
      .map(el => ({ el, url: el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data') }))
      .filter(({ url }) => url && /^(https?:)?\/\//i.test(url))
      .map(({ el, url }) => `<${el.tagName.toLowerCase()}> ${url}`)

    assert.deepEqual(externos, [], 'recurso de otro origen: A08 exige SRI y A03 vuelve a aplicar')
  })
})

describe('U11 · A10 — degradación declarada', () => {
  test('U11.6 · la pila de fuentes cae a sans-serif, nunca a serif', () => {
    /* A10 promete «pila de respaldo a fuentes del sistema, nunca a serif». Es
       una promesa concreta y comprobable: si la webfont no carga, el sitio no
       debe cambiar de personalidad tipográfica. */
    const pilas = fuente().match(/--font-[a-z]+:\s*([^;]+);/g) ?? []
    assert.ok(pilas.length >= 2, 'no se encontraron las pilas de fuentes')

    for (const pila of pilas) {
      assert.ok(/sans-serif\s*;?$/.test(pila.trim()), `la pila no termina en sans-serif: ${pila}`)
      assert.ok(
        !/(^|[\s,:])serif([\s,;]|$)/.test(pila.replace(/sans-serif/g, '')),
        `la pila incluye serif como respaldo: ${pila}`
      )
    }
  })
})

describe('U11 · A01 — los comentarios que se publican', () => {
  test('U11.9 · ningún comentario del código servido filtra un marcador sensible', {
    skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
  }, () => {
    /* Esta prueba existe porque el DAST tuvo que aceptar la regla 10027 de ZAP
       («Information Disclosure - Suspicious Comments») y hay que cubrir esa
       ceguera desde aquí.

       POR QUÉ SE ACEPTÓ ESA REGLA. Desde ADR-0007 el JS se sirve como archivo
       propio, así que ZAP lee sus comentarios — antes, dentro del HTML, no los
       miraba—. Y salta con la palabra castellana «todo»: su lista de marcadores
       sospechosos incluye el inglés `TODO`, y la comparación es insensible a
       mayúsculas. «Todo el JavaScript de index.html» es una frase normal en
       español, no un marcador pendiente.

       No se arregla reescribiendo la frase: «todo» es una de las palabras más
       comunes del idioma y volvería a colarse en el siguiente comentario. Y el
       sitio publica sus comentarios A PROPÓSITO —no hay minificado ni build,
       ADR-0003 y ADR-0007—, así que la premisa de la regla choca con una
       decisión de arquitectura.

       QUÉ HACE ESTA PRUEBA EN SU LUGAR: busca marcadores de trabajo pendiente en
       la forma inequívoca en que este repositorio los escribe, y secretos
       literales — no palabras sueltas. El detalle, y el error que cometió su
       primera versión, están junto a la lista. */
    /* La lista busca DOS cosas, y ninguna es «una palabra»:

       1. **Marcadores de trabajo pendiente**, en la forma inequívoca en que este
          repositorio los escribe. `TODO` exige mayúsculas y `:` o `>` detrás,
          para no confundirlo con el «todo» castellano — que es justo el error
          de la regla 10027 de ZAP.
       2. **Secretos literales**: una palabra clave seguida de una ASIGNACIÓN a
          un valor no trivial, y los prefijos de credencial que se reconocen a
          simple vista.

       La primera versión de esta prueba buscaba las palabras sueltas y repitió
       exactamente el error que venía a corregir: «token» casó con los **design
       tokens** de `legal.css`. Buscar «la palabra token» en comentarios escritos
       por personas produce ruido; buscar `token = "…"` produce hallazgos.

       Tampoco entra «bug»: en los comentarios de este repositorio describe casi
       siempre un fallo YA ARREGLADO —«el soft 404 fue un bug real»—, que es
       documentación y no una fuga. */
    const CLAVES = '(?:contrase(?:ñ|n)a|password|passwd|secret[oa]?|token|api[_\\- ]?key|credencial|credential|private[_\\- ]?key)'

    const SOSPECHOSOS = [
      { nombre: 'marcador TODO sin resolver', re: /\bTODO\s*[:>]/ },
      { nombre: 'FIXME', re: /\bFIXME\b/i },
      { nombre: 'XXX', re: /\bXXX\b/ },
      { nombre: 'HACK', re: /\bHACK\b/i },
      { nombre: 'secreto asignado a un literal', re: new RegExp(`${CLAVES}\\s*[:=]\\s*['"\`][^'"\`]{6,}`, 'i') },
      { nombre: 'credencial con prefijo reconocible', re: /\b(?:sk|pk|rk)_[A-Za-z0-9]{16,}\b|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{20,}\b|\beyJ[A-Za-z0-9_-]{20,}\./ }
    ]

    /** Comentarios de bloque y de línea de un archivo JS o CSS. */
    const comentariosDe = texto => [
      ...texto.matchAll(/\/\*[\s\S]*?\*\//g),
      ...texto.matchAll(/(?:^|[^:'"\\])\/\/.*$/gm)
    ].map(m => m[0])

    /** Comentarios HTML. */
    const comentariosHTML = texto => [...texto.matchAll(/<!--[\s\S]*?-->/g)].map(m => m[0])

    const objetivos = [
      ['assets/sitio.js', comentariosDe(fuenteJS())],
      ['index.html', comentariosHTML(fuente())],
      ['assets/legal.css', comentariosDe(leer('assets/legal.css'))]
    ]

    const hallazgos = []

    for (const [archivo, comentarios] of objetivos) {
      for (const comentario of comentarios) {
        for (const { nombre, re } of SOSPECHOSOS) {
          const m = comentario.match(re)
          if (m) {
            const contexto = comentario.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')
            hallazgos.push(`${archivo}: ${nombre} → «…${contexto}…»`)
          }
        }
      }
    }

    assert.deepEqual(
      hallazgos, [],
      'hay un marcador sensible en un comentario que se publica tal cual, sin minificar'
    )
  })
})

describe('U11 · A02 — endurecimiento declarado del contenedor', () => {
  test('U11.7 · el compose mantiene el endurecimiento que A02 declara', {
    skip: estaInstrumentado() && 'afirma sobre archivos del repositorio'
  }, () => {
    /* A02 enumera rootfs de solo lectura, `cap_drop: ALL` y
       `no-new-privileges`. Ninguna prueba lo comprobaba: se verificó a mano
       tras el cutover y ahí quedó. Si alguien los quita, esto lo dice.

       Es un contrato sobre el archivo, no sobre el contenedor en marcha: lo
       segundo depende de cómo se lance y ya mordió una vez —producción corría
       con `docker run` y sin nada de esto—. Por eso el paso 4 de verificación
       mide por el borde. */
    const compose = leer('docker-compose.yml')

    for (const directiva of ['read_only: true', 'cap_drop:', 'no-new-privileges:true']) {
      assert.ok(compose.includes(directiva), `docker-compose.yml perdió «${directiva}»`)
    }
    assert.match(compose, /cap_drop:\s*\n\s*-\s*ALL/, 'cap_drop debe seguir siendo ALL')
  })
})
