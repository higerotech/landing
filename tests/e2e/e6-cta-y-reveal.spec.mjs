/* E6 · El CTA de WhatsApp y la aparición al hacer scroll
   Lo que ningún `curl` puede comprobar: ambas cosas las decide el JS en el
   navegador. El redespliegue del 2026-07-31 mostraba `hidden` en el HTML
   servido y aun así el botón estaba bien; solo ejecutando la página se sabe. */

import { test, expect } from '@playwright/test'

test.describe('E6 · CTA de WhatsApp', () => {
  test('E6.1 · el botón se publica y apunta a wa.me', async ({ page }) => {
    await page.goto('/')

    const cta = page.locator('#wa-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', /^https:\/\/wa\.me\/\d{8,15}$/)
    await expect(cta).toHaveAttribute('target', '_blank')
  })

  test('E6.2 · el enlace externo no puede manipular la pestaña de origen', async ({ page }) => {
    await page.goto('/')
    const rel = await page.locator('#wa-cta').getAttribute('rel')
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  test('E6.3 · el botón es alcanzable con teclado', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('#wa-cta')
    await cta.focus()
    await expect(cta).toBeFocused()
  })

  test('E6.4 · el atributo hidden oculta de verdad', async ({ page }) => {
    /* Regresión de E4.5: sin una regla `[hidden]` propia, el `display` de
       `.btn-secondary` gana al del navegador y el atributo no oculta nada. Con
       el número vacío se publicaba un CTA muerto a `#contacto`, que es
       exactamente lo que el código dice querer evitar. */
    await page.goto('/')

    const resultado = await page.evaluate(() => {
      const el = document.getElementById('wa-cta')
      el.hidden = true
      return {
        display: getComputedStyle(el).display,
        alto: el.getBoundingClientRect().height
      }
    })

    expect(resultado.display).toBe('none')
    expect(resultado.alto).toBe(0)
  })
})

/* Recorre la página en pasos de una pantalla, como un lector.
   Saltar al final de golpe NO revela lo intermedio: `IntersectionObserver`
   dispara para lo que llega a intersecar, no para lo que se sobrevuela. Se
   descubrió escribiendo E6.5, y es un supuesto que conviene dejar por escrito:
   una prueba que salte al final daría un falso negativo y culparía al sitio. */
async function recorrerPagina (page) {
  const alto = await page.evaluate(() => window.innerHeight)
  const total = await page.evaluate(() => document.body.scrollHeight)

  for (let y = 0; y <= total; y += Math.floor(alto * 0.8)) {
    await page.evaluate(pos => window.scrollTo(0, pos), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
}

test.describe('E6 · aparición al hacer scroll', () => {
  test('E6.5 · el contenido se revela al llegar a él', async ({ page }) => {
    await page.goto('/')

    const total = await page.locator('.reveal').count()
    expect(total).toBeGreaterThan(0)

    /* Con IntersectionObserver real solo se revela lo que llega a verse, y en
       esta página el primer `.reveal` nace a ~1191px, bajo un viewport de 900:
       al cargar hay CERO revelados. No se asserta «alguno» —sería atarse a la
       altura del hero— sino que no estén todos, que es lo que distingue el
       observer de la rama de respaldo. */
    const alPrincipio = await page.locator('.reveal.in').count()
    expect(alPrincipio, 'no debería revelarse la página entera de golpe').toBeLessThan(total)

    await recorrerPagina(page)

    await expect.poll(
      () => page.locator('.reveal.in').count(),
      { message: 'al recorrer la página todos los .reveal deben revelarse' }
    ).toBe(total)
  })

  test('E6.6 · nada queda en opacidad 0 tras recorrer la página', async ({ page }) => {
    await page.goto('/')
    await recorrerPagina(page)

    const opacidades = await page.locator('.reveal').evaluateAll(
      els => els.map(el => getComputedStyle(el).opacity)
    )
    expect(opacidades.length).toBeGreaterThan(0)
    expect(opacidades.filter(o => Number(o) < 1)).toEqual([])
  })
})
