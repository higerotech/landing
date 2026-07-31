/* E9 · OWASP Top 10 — lo que solo se ve por HTTP
   Completa la matriz con los controles que exigen una respuesta real de nginx.
   Los que se pueden comprobar desde el DOM están en `tests/unit/u11-owasp.test.mjs`.

   No se repite aquí lo que ya cubren otros grupos: E3.5 (dotfiles denegados),
   E3.6 (versión de nginx en `/`), E3.7 (cinco cabeceras en cuatro rutas),
   E5 (la CSP bloqueando de verdad y la ausencia de terceros). */

import { test, expect } from '@playwright/test'

/* Las directivas que A02 enumera como «CSP restrictiva». Estaban en la
   configuración y nadie comprobaba que siguieran ahí: E5 verifica que la
   política se APLIQUE, pero no que conserve estas piezas concretas. */
const DIRECTIVAS_EXIGIDAS = [
  ["default-src 'self'", 'sin ella, todo lo no cubierto queda permitido'],
  ["frame-ancestors 'none'", 'es lo que impide el clickjacking — T2'],
  ["object-src 'none'", 'bloquea <object> y <embed>, vectores clásicos'],
  ["base-uri 'self'", 'impide que un <base> inyectado reescriba las rutas relativas'],
  ["form-action 'self'", 'impide exfiltrar por un formulario apuntando fuera'],
  ['upgrade-insecure-requests', 'A04: fuerza HTTPS en cualquier subrecurso']
]

test.describe('E9 · A02 — configuración servida', () => {
  test('E9.1 · la CSP conserva sus directivas de endurecimiento', async ({ request }) => {
    const csp = (await request.get('/')).headers()['content-security-policy'] ?? ''
    expect(csp, 'no llega la CSP').not.toBe('')

    const ausentes = DIRECTIVAS_EXIGIDAS
      .filter(([d]) => !csp.includes(d))
      .map(([d, porque]) => `${d} — ${porque}`)

    expect(ausentes).toEqual([])
  })

  test('E9.2 · tampoco se filtra la versión de nginx en un error', async ({ request }) => {
    /* A02 dice «sin versión de nginx en la cabecera `Server` **ni en páginas de
       error**». E3.6 solo miraba `/`, y las páginas de error las genera otro
       camino de nginx: es justo donde `server_tokens` se olvida. */
    const r = await request.get('/ruta-que-no-existe')
    expect(r.status()).toBe(404)
    expect(r.headers()['server'] ?? '').not.toMatch(/nginx\/[0-9]/)

    const cuerpo = await r.text()
    expect(cuerpo).not.toMatch(/nginx\/[0-9]/)
  })

  test('E9.3 · las cabeceras de seguridad llegan también a un 404', async ({ request }) => {
    /* E3.7 las comprueba en cuatro rutas que EXISTEN. Una respuesta de error
       sale por otro `location`, y la herencia rota de `add_header` —el bug de
       ADR-0002— es precisamente de las que se cuelan por ahí. */
    const cabeceras = (await request.get('/otra-ruta-inexistente')).headers()

    for (const c of ['content-security-policy', 'x-frame-options', 'x-content-type-options',
      'referrer-policy', 'permissions-policy']) {
      expect(cabeceras[c], `falta ${c} en la respuesta 404`).toBeTruthy()
    }
  })

  test('E9.4 · la tríada de aislamiento cross-origin está completa', async ({ request }) => {
    // COEP lo destapó el escaneo DAST; COOP y CORP ya estaban.
    const h = (await request.get('/')).headers()
    expect(h['cross-origin-opener-policy']).toBe('same-origin')
    expect(h['cross-origin-resource-policy']).toBe('same-origin')
    expect(h['cross-origin-embedder-policy']).toBe('require-corp')
  })
})

test.describe('E9 · A05 — inyección en un navegador real', () => {
  test('E9.5 · un payload en ?lang no ejecuta nada', async ({ page }) => {
    /* U11.3 lo comprueba en jsdom; aquí se exige además que ningún diálogo se
       abra y que la CSP no registre violaciones. Es la verificación que el
       threat model daba por hecha en T12. */
    const dialogos = []
    page.on('dialog', async d => { dialogos.push(d.message()); await d.dismiss() })

    await page.addInitScript(() => {
      window.__violacionesCSP = []
      document.addEventListener('securitypolicyviolation',
        e => window.__violacionesCSP.push(e.violatedDirective))
    })

    await page.goto('/?lang=' + encodeURIComponent('"><script>alert(1)</script>'))
    await page.waitForLoadState('networkidle')

    expect(dialogos).toEqual([])
    expect(await page.locator('html').getAttribute('lang')).toBe('es')
    expect(await page.evaluate(() => window.__violacionesCSP)).toEqual([])
  })
})

test.describe('E9 · A10 — condiciones excepcionales por HTTP', () => {
  test('E9.6 · un método no previsto no rompe ni filtra', async ({ request }) => {
    /* No hay formularios ni API, así que un POST no debería llevar a ninguna
       parte. Lo que importa es que la respuesta sea un error limpio y sin
       rastro del servidor, no un 500 con traza. */
    const r = await request.post('/', { data: 'x=1', failOnStatusCode: false })

    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect((await r.text())).not.toMatch(/nginx\/[0-9]/)
  })

  test('E9.7 · una ruta muy larga se rechaza sin filtrar detalles', async ({ request }) => {
    const r = await request.get('/' + 'a'.repeat(4000), { failOnStatusCode: false })

    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect((await r.text())).not.toMatch(/nginx\/[0-9]/)
  })
})
