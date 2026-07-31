/* E3 · Códigos de estado reales
   Tercero de los bugs de `7c7bc78`: antes `try_files … /index.html` devolvía
   200 con la landing para cualquier ruta, un soft 404 que los buscadores
   indexan. Esto solo se puede comprobar contra nginx, no contra jsdom. */

import { test, expect } from '@playwright/test'

test.describe('E3 · rutas y códigos de estado', () => {
  test('E3.1 · una ruta inexistente devuelve 404 de verdad', async ({ page }) => {
    const respuesta = await page.goto('/esta-ruta-no-existe')

    expect(respuesta.status()).toBe(404)
    // Y con la página propia, no la del servidor.
    await expect(page.locator('body')).toContainText(/404/)
  })

  test('E3.2 · el 404 conserva la identidad y un camino de vuelta', async ({ page }) => {
    await page.goto('/otra-ruta-inventada')
    const volver = page.locator('a[href="/"], a[href="./"], a[href="index.html"]').first()
    await expect(volver).toBeVisible()
  })

  test('E3.3 · las rutas de indexación responden 200', async ({ request }) => {
    for (const ruta of ['/robots.txt', '/sitemap.xml']) {
      const r = await request.get(ruta)
      expect(r.status(), `${ruta} debe existir`).toBe(200)
    }
  })

  test('E3.4 · los assets se sirven con su tipo', async ({ request }) => {
    const css = await request.get('/assets/fonts/fonts.css')
    expect(css.status()).toBe(200)
    expect(css.headers()['content-type']).toContain('text/css')

    const fuente = await request.get('/assets/fonts/inter-latin.woff2')
    expect(fuente.status()).toBe(200)
    expect(fuente.headers()['content-type']).toContain('font/woff2')
  })

  test('E3.5 · las rutas ocultas están denegadas', async ({ request }) => {
    // Control residual del A01/A02: `location ~ /\.` deniega los dotfiles.
    for (const ruta of ['/.git/config', '/.env']) {
      const r = await request.get(ruta)
      expect([403, 404], `${ruta} no debe servirse`).toContain(r.status())
    }
  })

  test('E3.6 · no se filtra la versión de nginx', async ({ request }) => {
    const r = await request.get('/')
    expect(r.headers()['server'] ?? '').not.toMatch(/nginx\/[0-9]/)
  })

  test('E3.7 · las cinco cabeceras de seguridad llegan a todas las rutas', async ({ request }) => {
    /* El bug de `7c7bc78` era exactamente que llegaban a unas rutas y a otras
       no, por la herencia rota de `add_header` (ADR-0002). */
    const esperadas = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy'
    ]

    for (const ruta of ['/', '/index.html', '/assets/fonts/fonts.css', '/robots.txt']) {
      const r = await request.get(ruta)
      const cabeceras = r.headers()
      for (const c of esperadas) {
        expect(cabeceras[c], `falta ${c} en ${ruta}`).toBeTruthy()
      }
    }
  })
})
