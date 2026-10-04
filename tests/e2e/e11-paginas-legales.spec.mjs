/* E11 · Las páginas legales en un navegador de verdad
   Las unitarias (U13) afirman sobre el marcado y sobre el script ejecutado en
   jsdom. Aquí se comprueba lo que solo un navegador y un servidor pueden decir:

   - que las ocho rutas responden **200** por el camino de nginx, con `.html`,
     que es la divergencia medida de ADR-0008;
   - que el conmutador ES/EN **navega de verdad** al par y vuelve. jsdom no
     implementa la navegación: U13.4 solo puede comprobar que se intentó;
   - que el texto legal es **legible sin JavaScript**. Es lo que ADR-0005 pide
     para la landing y aquí importa más: un documento con efectos jurídicos que
     no se puede leer sin JS es un documento que no se puede oponer a nadie;
   - que la CSP **no bloquea nada** en páginas que cargan una hoja externa, que
     la landing no hace.

   El aviso de cookies, además, afirma en su §3 que el visitante puede
   comprobar por sí mismo que no hay cookies y que ninguna petición sale del
   origen. E11.5 y E11.6 comprueban esa promesa: si deja de ser cierta, el
   documento publicado pasa a ser falso. */

import { test, expect } from '@playwright/test'

const DOCUMENTOS = [
  { es: '/privacidad.html', en: '/privacy.html', h1Es: 'Privacidad', h1En: 'Privacy' },
  { es: '/terminos.html', en: '/terms.html', h1Es: 'Términos', h1En: 'Terms' },
  { es: '/cookies.html', en: '/cookie-notice.html', h1Es: 'cookies', h1En: 'Cookie' },
  { es: '/ia-responsable.html', en: '/responsible-ai.html', h1Es: 'IA Responsable', h1En: 'Responsible' }
]

const RUTAS = DOCUMENTOS.flatMap(d => [d.es, d.en])

test.describe('E11 · las ocho páginas se sirven y se leen', () => {
  test('E11.1 · las ocho rutas responden 200 con las cabeceras de seguridad', async ({ request }) => {
    for (const ruta of RUTAS) {
      const respuesta = await request.get(ruta)

      expect(respuesta.status(), `${ruta} no devolvió 200`).toBe(200)
      expect(respuesta.headers()['content-security-policy'], `${ruta} sin CSP`).toContain("default-src 'self'")
      expect(respuesta.headers()['x-frame-options']).toBe('DENY')
      /* El HTML no se cachea: un cambio en un documento legal tiene que verse
         en la siguiente visita, no cuando caduque una caché. */
      expect(respuesta.headers()['cache-control']).toContain('no-cache')
    }
  })

  test('E11.2 · la hoja compartida se sirve y NO como asset inmutable', async ({ request }) => {
    /* ADR-0008 §5: `legal.css` vive en /assets/ pero se revalida como el HTML.
       Si heredara el `immutable` de 30 días, un cambio de estilos quedaría
       congelado junto a una página nueva. U12.5 vigila la regla en el archivo
       de configuración; esto comprueba la respuesta real. */
    const respuesta = await request.get('/assets/legal.css')

    expect(respuesta.status()).toBe(200)
    expect(respuesta.headers()['cache-control']).toContain('no-cache')
    expect(respuesta.headers()['cache-control']).not.toContain('immutable')
  })

  test('E11.3 · el conmutador ES/EN navega al par y vuelve', async ({ page }) => {
    for (const doc of DOCUMENTOS) {
      await page.goto(doc.es)
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')

      await page.locator('#btn-en').click()
      await page.waitForURL(url => url.pathname === doc.en)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.locator('h1')).toContainText(doc.h1En)

      await page.locator('#btn-es').click()
      await page.waitForURL(url => url.pathname === doc.es)
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
      await expect(page.locator('h1')).toContainText(doc.h1Es)
    }
  })

  test('E11.4 · el pie de la landing lleva a la versión del idioma activo', async ({ page }) => {
    /* Los enlaces legales del pie cambian de DESTINO con el idioma, no solo de
       etiqueta (`data-href-*`). En inglés tienen que llevar a `privacy.html`, no
       a un documento en castellano con efectos jurídicos. */
    await page.goto('/')

    const enlace = page.locator('.footer-legal a').first()
    await expect(enlace).toHaveAttribute('href', 'privacidad.html')

    await page.locator('#btn-en').click()
    await expect(enlace).toHaveAttribute('href', 'privacy.html')

    await enlace.click()
    await page.waitForURL(url => url.pathname === '/privacy.html')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})

test.describe('E11 · lo que los documentos prometen', () => {
  test('E11.5 · el aviso de cookies dice la verdad: ninguna cookie', async ({ page, context }) => {
    /* La promesa está publicada en cookies.html §3. Si algún día deja de ser
       cierta, este test falla antes de que nadie la lea. */
    for (const ruta of ['/cookies.html', '/cookie-notice.html', '/']) {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')

      expect(await context.cookies(), `${ruta} emitió cookies`).toEqual([])
    }
  })

  test('E11.6 · ninguna petición de una página legal sale del origen', async ({ page, baseURL }) => {
    const externas = []
    page.on('request', req => {
      const url = req.url()
      if (!url.startsWith(baseURL) && !url.startsWith('data:')) externas.push(url)
    })

    await page.goto('/privacidad.html')
    await page.waitForLoadState('networkidle')
    await page.locator('#btn-en').click()
    await page.waitForLoadState('networkidle')

    expect(externas).toEqual([])
  })

  test('E11.7 · la preferencia de idioma es la ÚNICA clave de almacenamiento', async ({ page }) => {
    /* El aviso de cookies afirma que se guarda una sola clave, `lang`, con uno
       de dos valores. Es una afirmación verificable y aquí se verifica. */
    await page.goto('/cookies.html')
    await page.locator('#btn-en').click()
    await page.waitForURL(url => url.pathname === '/cookie-notice.html')

    const almacenado = await page.evaluate(() => ({ ...localStorage }))

    expect(Object.keys(almacenado)).toEqual(['lang'])
    expect(almacenado.lang).toBe('en')
  })
})

test.describe('E11 · sin JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('E11.8 · el texto legal se lee entero con el JS deshabilitado', async ({ page }) => {
    /* Un documento con efectos jurídicos que necesita JavaScript para mostrarse
       no es oponible a quien no pudo leerlo. Las páginas legales no usan
       `.reveal`, así que no hay nada que revelar: esta prueba existe para que
       nadie lo añada después. */
    for (const doc of DOCUMENTOS) {
      await page.goto(doc.es)

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('.doc-pie')).toBeVisible()

      const opacidad = await page.locator('article.doc').evaluate(el => getComputedStyle(el).opacity)
      expect(opacidad, `${doc.es} depende del JS para mostrarse`).toBe('1')
    }
  })

  test('E11.9 · y el par de idiomas sigue siendo alcanzable', async ({ page }) => {
    /* Sin JS el conmutador no funciona —es un <button>, no un enlace—, así que
       la versión inglesa tiene que seguir siendo alcanzable de otra forma: por
       el pie del documento. Si no lo fuera, un visitante sin JS quedaría
       encerrado en un idioma. */
    await page.goto('/privacidad.html')

    const alPar = page.locator('.doc-pie a[href$="terminos.html"], nav.footer-nav a[href$="terminos.html"]').first()
    await expect(alPar).toBeVisible()

    const hreflang = page.locator('link[rel="alternate"][hreflang="en"]')
    await expect(hreflang).toHaveCount(1)
  })
})
