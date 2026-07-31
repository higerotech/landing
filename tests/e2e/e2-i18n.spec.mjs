/* E2 · Idioma en navegador real
   Segundo de los tres bugs de `7c7bc78`. Las unitarias ya cubren la lógica;
   aquí importa que el usuario vea el cambio y que sobreviva a una recarga. */

import { test, expect } from '@playwright/test'

const tituloCta = page => page.locator('#contacto .cta-title')

test.describe('E2 · idioma', () => {
  test('E2.1 · arranca en español', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.locator('#btn-es')).toHaveAttribute('aria-pressed', 'true')
    await expect(tituloCta(page)).toContainText('ventaja competitiva')
  })

  test('E2.2 · pulsar EN cambia el contenido visible', async ({ page }) => {
    await page.goto('/')
    const antes = await tituloCta(page).innerText()

    await page.locator('#btn-en').click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#btn-en')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#btn-es')).toHaveAttribute('aria-pressed', 'false')
    await expect(tituloCta(page)).toContainText('competitive edge')
    expect(await tituloCta(page).innerText()).not.toBe(antes)
  })

  test('E2.3 · ?lang=en sirve inglés directamente', async ({ page }) => {
    // Es lo que hace compartible un enlace en inglés.
    await page.goto('/?lang=en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(tituloCta(page)).toContainText('competitive edge')
  })

  test('E2.4 · la preferencia sobrevive a una recarga', async ({ page }) => {
    await page.goto('/')
    await page.locator('#btn-en').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(tituloCta(page)).toContainText('competitive edge')
  })

  test('E2.5 · cuatro ciclos no pierden contenido', async ({ page }) => {
    /* La unitaria U3.4 compara `innerHTML` en jsdom; esto compara lo que el
       usuario LEE, después de que el navegador haya reconstruido el DOM ocho
       veces. */
    await page.goto('/')
    const original = await page.locator('main, body').first().innerText()

    for (let i = 0; i < 4; i++) {
      await page.locator('#btn-en').click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await page.locator('#btn-es').click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    }

    expect(await page.locator('main, body').first().innerText()).toBe(original)
  })

  test('E2.6 · el idioma también alcanza a la etiqueta del menú móvil', async ({ page }) => {
    await page.setViewportSize({ width: 980, height: 900 })
    await page.goto('/')

    const toggle = page.locator('#nav-toggle')
    const enEs = await toggle.getAttribute('aria-label')

    await page.locator('#btn-en').click()
    const enEn = await toggle.getAttribute('aria-label')

    expect(enEn).not.toBe(enEs)
    expect(enEn).toBe(await toggle.getAttribute('data-label-open-en'))
  })
})
