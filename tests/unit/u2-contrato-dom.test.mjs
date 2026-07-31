/* U2 · Contrato JS↔DOM — P0
   El script referencia seis `id` sin ninguna guarda de nulidad. Estos tests
   localizan cuál se rompió; U1 solo dice que algo se rompió. */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cargarDOM, fuente } from '../helpers/cargar-dom.mjs'

const IDS_EXIGIDOS = ['wa-cta', 'nav-toggle', 'nav-links', 'btn-es', 'btn-en', 'year']

const ETIQUETAS_TOGGLE = [
  'data-label-open',
  'data-label-close',
  'data-label-open-en',
  'data-label-close-en'
]

describe('U2 · contrato entre el script y el DOM', () => {
  test('U2.1 · los seis id que el script exige existen y son únicos', () => {
    const { doc } = cargarDOM()

    for (const id of IDS_EXIGIDOS) {
      const coincidencias = doc.querySelectorAll(`[id="${id}"]`)
      assert.equal(
        coincidencias.length, 1,
        `#${id}: se esperaba exactamente 1 elemento, hay ${coincidencias.length}. ` +
        'Cero rompe el script; dos o más hacen que getElementById devuelva el ' +
        'primero y el bug se manifieste como «no responde».'
      )
    }
  })

  test('U2.2 · #nav-toggle lleva los cuatro atributos de etiqueta', () => {
    const { doc } = cargarDOM()
    const toggle = doc.getElementById('nav-toggle')

    for (const attr of ETIQUETAS_TOGGLE) {
      const valor = toggle.getAttribute(attr)
      assert.ok(
        valor && valor.trim().length > 0,
        `#nav-toggle carece de ${attr}: syncToggleLabel() pondría aria-label a null`
      )
    }
  })

  test('U2.4 · la hoja de estilos define una regla [hidden]', () => {
    /* Sin ella, el `display` del navegador para [hidden] lo pisa cualquier
       regla de autor que fije display —`.btn-secondary` usa inline-flex— y el
       atributo deja de ocultar. Le pasaba a #wa-cta: con el número sin
       configurar el botón se veía igual, un CTA muerto a `#contacto`.

       Esta es la guarda barata sobre el fuente. La comprobación de verdad, con
       cascada real, es E6.4 en las E2E: jsdom no resuelve el conflicto entre la
       hoja del navegador y la de autor, así que aquí no se puede verificar el
       comportamiento, solo que la regla exista. */
    assert.match(
      fuente(), /\[hidden\]\s*\{[^}]*display:\s*none[^}]*\}/,
      'falta la regla [hidden] { display: none !important }'
    )
  })

  test('U2.5 · el @font-face inlinado no se ha desviado de fonts.css', () => {
    /* `index.html` inlina las reglas de `assets/fonts/fonts.css` para ahorrar
       un round trip en la cadena crítica —vale ~645 ms de LCP en 3G lento—,
       pero `404.html` sigue enlazando el archivo, así que las mismas reglas
       viven en dos sitios y no hay build que las sincronice.

       Esta prueba convierte esa deriva en un fallo. Si alguien cambia
       `fonts.css` y no toca el bloque inlinado, o al revés, salta aquí. */
    const css = readFileSync(new URL('../../assets/fonts/fonts.css', import.meta.url), 'utf8')

    const normalizar = t => t
      .replace(/\/\*[\s\S]*?\*\//g, '')   // comentarios
      .replace(/\s+/g, ' ')
      .trim()

    /* En el archivo las URL son relativas a `assets/fonts/`; inlinadas en el
       HTML lo son a la raíz del documento. Esa es la única diferencia legítima. */
    const esperado = normalizar(css).replace(/url\('/g, "url('assets/fonts/")

    const reglas = normalizar(fuente())
    const declaraciones = esperado.match(/@font-face \{[^}]*\}/g) ?? []

    assert.ok(declaraciones.length >= 4, 'no se encontraron las @font-face en fonts.css')

    const ausentes = declaraciones.filter(d => !reglas.includes(d))
    assert.deepEqual(
      ausentes.map(d => (d.match(/font-family: '([^']+)'/) ?? [])[1] + ' — ' +
                        (d.match(/url\('([^']+)'/) ?? [])[1]),
      [],
      'el bloque inlinado de index.html ya no coincide con assets/fonts/fonts.css'
    )
  })

  test('U2.3 · #wa-cta sale del HTML oculto', () => {
    /* Protege la decisión de RF05: mientras CONTACT.whatsapp esté vacío el
       botón no debe publicarse. Si el atributo `hidden` se cae del HTML, el
       enlace muerto se publica aunque la constante siga vacía. */
    const { doc } = cargarDOM()
    const cta = doc.getElementById('wa-cta')
    const numero = cargarDOM().lexico('CONTACT.whatsapp')

    if (!numero) {
      assert.equal(cta.hidden, true, 'sin número configurado, #wa-cta debe estar oculto')
    }
  })
})
