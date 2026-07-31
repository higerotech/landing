/* E5 · CSP aplicándose de verdad, y cero terceros
   jsdom no impone la CSP: en las unitarias la cabecera es texto. Un navegador
   sí la aplica, así que aquí se comprueba que la política se cumple y, más
   importante, que BLOQUEA cuando toca. Y de paso el ADR-0004: si aparece una
   petición cross-origin, es una regresión. */

import { test, expect } from '@playwright/test'

/** Instala un recolector de violaciones de CSP antes de que cargue la página. */
async function recolectarViolaciones (page) {
  await page.addInitScript(() => {
    window.__violacionesCSP = []
    document.addEventListener('securitypolicyviolation', e => {
      window.__violacionesCSP.push({
        directiva: e.violatedDirective,
        bloqueado: e.blockedURI
      })
    })
  })
}

test.describe('E5 · CSP y ausencia de terceros', () => {
  test('E5.1 · la página carga sin ninguna violación de CSP', async ({ page }) => {
    await recolectarViolaciones(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(await page.evaluate(() => window.__violacionesCSP)).toEqual([])
  })

  test('E5.2 · la CSP bloquea de verdad una conexión externa', async ({ page }) => {
    /* Sin esto, E5.1 pasaría igual con una CSP que no se aplicara: «cero
       violaciones» también es lo que se ve cuando no hay política. Este test
       provoca una y exige que salte. */
    await recolectarViolaciones(page)
    await page.goto('/')

    await page.evaluate(() =>
      fetch('https://example.com/sonda').catch(() => {})
    )
    await page.waitForFunction(() => window.__violacionesCSP.length > 0, null, { timeout: 5000 })

    const violaciones = await page.evaluate(() => window.__violacionesCSP)
    expect(violaciones.some(v => v.directiva.startsWith('connect-src'))).toBe(true)
  })

  test('E5.3 · la CSP bloquea una imagen de otro origen', async ({ page }) => {
    await recolectarViolaciones(page)
    await page.goto('/')

    await page.evaluate(() => {
      const img = document.createElement('img')
      img.src = 'https://example.com/pixel.png'
      document.body.appendChild(img)
    })
    await page.waitForFunction(() => window.__violacionesCSP.length > 0, null, { timeout: 5000 })

    const violaciones = await page.evaluate(() => window.__violacionesCSP)
    expect(violaciones.some(v => v.directiva.startsWith('img-src'))).toBe(true)
  })

  test('E5.4 · ninguna petición sale del propio origen', async ({ page, baseURL }) => {
    /* ADR-0004: fuentes autoalojadas, cero terceros. Es también el control de
       T13 —fuga de la IP del visitante— y de T5. */
    const externas = []
    page.on('request', req => {
      const url = req.url()
      if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externas.push(url)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('#btn-en').click()

    expect(externas).toEqual([])
  })

  test('E5.5 · las fuentes de marca se sirven desde el propio origen', async ({ page }) => {
    const fuentes = []
    page.on('response', r => {
      if (/\.woff2?$/.test(r.url())) fuentes.push({ url: r.url(), estado: r.status() })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(fuentes.length, 'no se cargó ninguna webfont').toBeGreaterThan(0)
    for (const f of fuentes) {
      expect(f.estado).toBe(200)
      expect(f.url).toContain('/assets/fonts/')
    }
  })

  test('E5.6 · la consola no acumula errores', async ({ page }) => {
    const errores = []
    page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', e => errores.push(String(e)))

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('#btn-en').click()
    await page.locator('#btn-es').click()

    expect(errores).toEqual([])
  })
})
