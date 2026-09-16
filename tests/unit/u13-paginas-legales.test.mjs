/* U13 · Las páginas legales — contrato del cromo y del idioma fijo
   Ocho archivos (cuatro documentos × dos idiomas) que comparten el script de la
   landing, su hoja `assets/legal.css` y la misma barra y pie. Ver ADR-0008.

   Lo que estas pruebas protegen no es la redacción legal —eso lo revisa una
   persona— sino tres cosas que se rompen en silencio:

   1. **El cromo.** `assets/sitio.js` desreferencia `#nav-toggle`, `#nav-links`,
      `#btn-es`, `#btn-en` y `#year` SIN guarda de nulidad. Una página legal a la
      que le falte uno de esos `id` lanza en el nivel superior y, como el cuerpo
      del documento no depende del JS, se queda con la barra a medias y el
      conmutador muerto. Es T17 con otro disfraz.

   2. **El par de idiomas.** El conmutador de una página de idioma fijo NAVEGA al
      archivo que declara `data-href-*`. Si ese archivo no existe, el botón EN
      lleva a un 404; si el par no se declara de vuelta, se llega a un documento
      del que no se puede salir.

   3. **La prevalencia.** La versión castellana es la única que produce efectos.
      Si esa nota desaparece de una traducción, el documento pasa a sostener que
      las dos versiones valen igual, que es lo contrario de lo acordado. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { cargarDOM, fuenteDe, estaInstrumentado } from '../helpers/cargar-dom.mjs'

/* Los cuatro documentos y sus dos archivos. Esta tabla es la especificación:
   si se añade un documento legal, se añade aquí y las nueve pruebas lo cubren. */
const DOCUMENTOS = [
  { nombre: 'privacidad',    es: 'privacidad.html',      en: 'privacy.html' },
  { nombre: 'términos',      es: 'terminos.html',        en: 'terms.html' },
  { nombre: 'cookies',       es: 'cookies.html',         en: 'cookie-notice.html' },
  { nombre: 'IA responsable', es: 'ia-responsable.html', en: 'responsible-ai.html' }
]

const PAGINAS = DOCUMENTOS.flatMap(d => [
  { archivo: d.es, lang: 'es', par: d.en, doc: d },
  { archivo: d.en, lang: 'en', par: d.es, doc: d }
])

/* Los `id` que el script usa sin guarda. `wa-cta` no está: ese sí lo guarda
   `if (!cta)`, y las páginas legales no publican el botón de WhatsApp. */
const IDS_EXIGIDOS = ['nav-toggle', 'nav-links', 'btn-es', 'btn-en', 'year']

/** La página parseada SIN ejecutar nada, para afirmar sobre el marcado. */
const crudo = archivo => new JSDOM(fuenteDe(archivo)).window.document

describe('U13 · el cromo que el script exige', () => {
  for (const { archivo } of PAGINAS) {
    test(`U13.1 · ${archivo} trae los ${IDS_EXIGIDOS.length} id que el script desreferencia`, () => {
      const doc = crudo(archivo)

      for (const id of IDS_EXIGIDOS) {
        assert.equal(
          doc.querySelectorAll(`#${id}`).length, 1,
          `${archivo}: falta #${id} o está duplicado — el script lanzaría en el nivel superior`
        )
      }
    })
  }

  test('U13.2 · y el script se ejecuta hasta el final en todas', () => {
    /* La comprobación de verdad: cargar cada página con el script dentro y
       exigir que no lance. U13.1 dice qué falta; esta dice si funciona. */
    for (const { archivo, lang } of PAGINAS) {
      const { errores, doc } = cargarDOM({ archivo })

      assert.deepEqual(
        errores.map(e => e.message ?? String(e)), [],
        `${archivo}: el script lanzó al cargar`
      )
      assert.equal(
        doc.getElementById('year').textContent, String(new Date().getFullYear()),
        `${archivo}: no llegó la última parte del script`
      )
      assert.equal(doc.documentElement.lang, lang, `${archivo}: quedó con el idioma equivocado`)
    }
  })
})

describe('U13 · el par de idiomas', () => {
  for (const { archivo, lang, par, doc: documento } of PAGINAS) {
    test(`U13.3 · ${archivo} declara idioma fijo y apunta a ${par}`, {
      skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
    }, () => {
      const html = crudo(archivo).documentElement

      assert.ok(
        html.hasAttribute('data-idioma-fijo'),
        `${archivo}: sin data-idioma-fijo el conmutador reescribiría el texto legal en vez de navegar`
      )
      assert.equal(html.getAttribute('lang'), lang)
      assert.equal(html.getAttribute('data-href-es'), documento.es)
      assert.equal(html.getAttribute('data-href-en'), documento.en)

      /* Y el destino tiene que existir de verdad: un conmutador que lleva a un
         404 es peor que uno que no hace nada. */
      assert.ok(existsSync(new URL(`../../${par}`, import.meta.url)), `${archivo}: su par ${par} no existe`)
    })
  }

  test('U13.4 · el conmutador navega: guarda la preferencia y NO reescribe el texto', () => {
    /* El comportamiento completo en una sola prueba, porque las tres
       afirmaciones solo tienen sentido juntas:

       - se guarda el idioma ANTES de navegar (después de `location.assign` ya no
         hay ocasión, y la página de destino lo necesita para su cromo);
       - el DOM NO se reescribe: el cuerpo está en castellano y traducir el cromo
         dejaría un `<html lang="en">` sobre un texto legal en español;
       - se intenta navegar de verdad. jsdom no implementa la navegación y deja
         constancia, y esa constancia es la evidencia que se afirma aquí. */
    const { doc, win, errores } = cargarDOM({
      archivo: 'privacidad.html',
      url: 'https://higerotech.com/privacidad.html'
    })

    assert.equal(doc.documentElement.lang, 'es')

    doc.getElementById('btn-en').dispatchEvent(new win.Event('click'))

    assert.equal(win.localStorage.getItem('lang'), 'en', 'no guardó la preferencia antes de navegar')
    assert.equal(doc.documentElement.lang, 'es', 'reescribió el documento en vez de navegar')
    assert.ok(
      errores.some(e => /navigation/i.test(e.message ?? String(e))),
      'no intentó navegar: el conmutador se quedó sin efecto'
    )
  })

  test('U13.5 · al cargar manda el idioma del documento, y no pisa la preferencia guardada', () => {
    /* Quien tenía elegido el inglés y llega por un enlace directo a la versión
       castellana debe ver el documento en castellano —es el que produce
       efectos— sin que esa visita le cambie la preferencia para el resto del
       sitio. */
    const { doc, win } = cargarDOM({
      archivo: 'privacidad.html',
      url: 'https://higerotech.com/privacidad.html',
      alPreparar: w => w.localStorage.setItem('lang', 'en')
    })

    assert.equal(doc.documentElement.lang, 'es', 'la preferencia guardada no debe traducir una página de idioma fijo')
    assert.equal(win.localStorage.getItem('lang'), 'en', 'la carga pisó la preferencia del visitante')
  })

  test('U13.6 · sin par declarado el botón no queda muerto: traduce el cromo', () => {
    /* La rama de respaldo de `pedirIdioma`. Se provoca quitando el par del
       <html>, y lo que se exige es que el conmutador siga haciendo algo. */
    const { doc, win } = cargarDOM({
      archivo: 'privacidad.html',
      sustituir: { de: ' data-href-en="privacy.html"', a: '' }
    })

    doc.getElementById('btn-en').dispatchEvent(new win.Event('click'))

    assert.equal(
      doc.documentElement.lang, 'en',
      'sin par declarado, el conmutador debe al menos traducir el cromo'
    )
  })
})

describe('U13 · contrato de publicación', () => {
  for (const { archivo } of PAGINAS) {
    test(`U13.7 · ${archivo} carga la hoja compartida, las fuentes y el script`, {
      skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
    }, () => {
      const doc = crudo(archivo)
      const hrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'))

      assert.ok(hrefs.includes('assets/legal.css'), `${archivo}: no carga assets/legal.css`)
      assert.ok(hrefs.includes('assets/fonts/fonts.css'), `${archivo}: no carga las fuentes autoalojadas`)
      assert.equal(
        doc.querySelector('script[src]')?.getAttribute('src'), 'assets/sitio.js',
        `${archivo}: no carga el script del sitio`
      )
      assert.equal(
        doc.querySelectorAll('script:not([src]):not([type])').length, 0,
        `${archivo}: tiene un script inline ejecutable y la CSP lo bloquearía`
      )
    })
  }

  for (const { archivo, lang, doc: documento } of PAGINAS) {
    test(`U13.8 · ${archivo} declara canonical y hreflang coherentes`, {
      skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
    }, () => {
      /* Las URL canónicas van SIN extensión porque son las del Worker, que es
         el camino canónico a producción. Los enlaces internos sí llevan `.html`
         para funcionar también por el camino de nginx. Ver ADR-0008. */
      const doc = crudo(archivo)
      const sinExtension = n => n.replace(/\.html$/, '')

      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
      assert.equal(canonical, `https://higerotech.com/${sinExtension(archivo)}`)

      const alternos = Object.fromEntries(
        [...doc.querySelectorAll('link[rel="alternate"][hreflang]')]
          .map(l => [l.getAttribute('hreflang'), l.getAttribute('href')])
      )

      assert.equal(alternos.es, `https://higerotech.com/${sinExtension(documento.es)}`)
      assert.equal(alternos.en, `https://higerotech.com/${sinExtension(documento.en)}`)
      assert.equal(
        alternos['x-default'], `https://higerotech.com/${sinExtension(documento.es)}`,
        'el x-default debe ser la versión castellana: es la que produce efectos'
      )
      assert.equal(doc.documentElement.getAttribute('lang'), lang)
    })
  }

  test('U13.9 · las ocho páginas declaran que la versión castellana prevalece', {
    skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
  }, () => {
    /* Sin esta nota, una traducción de cortesía pasa a sostener que las dos
       versiones valen igual, y una discrepancia entre ellas se vuelve una
       ambigüedad con efectos jurídicos. */
    for (const { archivo, lang } of PAGINAS) {
      const texto = fuenteDe(archivo)
      const esperado = lang === 'es' ? /Versión prevalente/ : /Prevailing version/

      assert.match(texto, esperado, `${archivo}: le falta la nota de versión prevalente`)
      assert.match(
        texto, lang === 'es' ? /prevalece este texto/ : /the Spanish text prevails/,
        `${archivo}: la nota no dice cuál de las dos versiones prevalece`
      )
    }
  })

  test('U13.10 · todo enlace con destino por idioma apunta a un archivo que existe', {
    skip: estaInstrumentado() && 'afirma sobre el fuente publicado'
  }, () => {
    /* La convención `data-href-es`/`data-href-en` la lee `setLang()` para
       cambiar el DESTINO de un enlace y no solo su etiqueta. Vive en las ocho
       páginas legales y en el pie de la landing.

       Dos formas de romperla, las dos silenciosas: declarar solo uno de los dos
       atributos —el enlace se queda apuntando a un idioma para siempre— o
       apuntar a un archivo que no existe, que solo se nota al hacer clic
       estando en el otro idioma. */
    for (const archivo of ['index.html', ...PAGINAS.map(p => p.archivo)]) {
      const doc = crudo(archivo)

      for (const a of doc.querySelectorAll('a[data-href-es], a[data-href-en]')) {
        const es = a.getAttribute('data-href-es')
        const en = a.getAttribute('data-href-en')
        const etiqueta = (a.textContent || '').trim().slice(0, 30)

        assert.ok(es && en, `${archivo}: el enlace «${etiqueta}» declara solo uno de los dos destinos`)

        for (const destino of [es, en]) {
          assert.ok(
            existsSync(new URL(`../../${destino}`, import.meta.url)),
            `${archivo}: el enlace «${etiqueta}» apunta a ${destino}, que no existe`
          )
        }
      }
    }
  })
})
