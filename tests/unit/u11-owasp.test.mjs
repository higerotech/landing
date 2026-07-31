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
import { cargarDOM, fuente, estaInstrumentado } from '../helpers/cargar-dom.mjs'

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
    for (const archivo of ['index.html', '404.html']) {
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
