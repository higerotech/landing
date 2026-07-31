/* E4 · La página sin JavaScript
   Es LA prueba que ADR-0005 se propuso a sí mismo y nunca se escribió:
   «prueba E2E de Playwright con JS deshabilitado que verifique que el texto de
   la última sección es visible». Con `.reveal { opacity: 0 }`, sin el
   `<noscript>` el 80 % de la página quedaría invisible.

   No cubre T17 —una excepción a mitad del script no es lo mismo que no
   ejecutarlo, y el `<noscript>` no se aplica en ese caso—; de eso se encarga
   U1.5. Aquí se comprueba la capa 1 de las tres de ADR-0005. */

import { test, expect } from '@playwright/test'

test.use({ javaScriptEnabled: false })

const opacidadDe = (page, selector) =>
  page.locator(selector).evaluate(el => getComputedStyle(el).opacity)

test.describe('E4 · degradación sin JavaScript', () => {
  test('E4.1 · el contenido de la última sección es visible', async ({ page }) => {
    await page.goto('/')

    const titulo = page.locator('#contacto .cta-title')
    await expect(titulo).toBeVisible()
    await expect(titulo).toContainText('ventaja competitiva')

    /* `toBeVisible()` NO mira la opacidad, así que por sí solo pasaría con la
       página en blanco. Hay que comprobarla explícitamente: es justo el fallo
       del que protege el `<noscript>`. */
    expect(await opacidadDe(page, '#contacto .cta-inner')).toBe('1')
  })

  test('E4.2 · ninguno de los .reveal queda invisible', async ({ page }) => {
    await page.goto('/')

    const opacidades = await page.locator('.reveal').evaluateAll(
      els => els.map(el => getComputedStyle(el).opacity)
    )

    expect(opacidades.length).toBeGreaterThan(0)
    expect(opacidades.filter(o => o !== '1')).toEqual([])
  })

  test('E4.3 · las secciones y su texto siguen ahí', async ({ page }) => {
    await page.goto('/')

    for (const id of ['servicios', 'metodologia', 'arquitectura', 'cumplimiento', 'contacto']) {
      await expect(page.locator(`#${id}`)).toBeVisible()
    }
    // El contenido por defecto del marcado es el español, sin que corra setLang.
    await expect(page.locator('#contacto .cta-sub')).toContainText('diagnóstico')
  })

  test('E4.4 · el correo de contacto sigue siendo alcanzable', async ({ page }) => {
    // Sin JS no hay WhatsApp; el camino de contacto no puede depender de él.
    await page.goto('/')
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible()
  })

  test('E4.5 · el botón de WhatsApp permanece oculto sin JS', async ({ page }) => {
    /* Correcto por diseño: `initWhatsApp()` es quien lo publica. Sin JS debe
       seguir oculto y no aparecer como enlace muerto a `#contacto`. */
    await page.goto('/')
    await expect(page.locator('#wa-cta')).toBeHidden()
  })
})
