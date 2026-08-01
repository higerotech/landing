/* E1 · Menú móvil en el breakpoint REAL
   Es lo que las unitarias no pueden afirmar: U7.6 verifica el cableado contra
   un stub de `matchMedia`, pero que el umbral correcto sea 980px solo lo dice
   un navegador midiendo. Cubre el primero de los tres bugs de `7c7bc78`. */

import { test, expect } from '@playwright/test'

const MOVIL = { width: 980, height: 900 }      // último ancho con menú móvil
const ESCRITORIO = { width: 981, height: 900 } // primero sin él

test.describe('E1 · menú móvil', () => {
  test('E1.1 · a 980px el toggle manda y el panel arranca cerrado', async ({ page }) => {
    await page.setViewportSize(MOVIL)
    await page.goto('/')

    await expect(page.locator('#nav-toggle')).toBeVisible()
    await expect(page.locator('#nav-links')).toBeHidden()
    await expect(page.locator('#nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  })

  test('E1.2 · a 981px el menú es de escritorio', async ({ page }) => {
    /* El otro lado exacto del umbral. Si alguien mueve el media query, uno de
       estos dos tests cae y dice cuál de los dos lados se rompió. */
    await page.setViewportSize(ESCRITORIO)
    await page.goto('/')

    await expect(page.locator('#nav-toggle')).toBeHidden()
    await expect(page.locator('#nav-links')).toBeVisible()
  })

  test('E1.3 · el toggle abre y cierra', async ({ page }) => {
    await page.setViewportSize(MOVIL)
    await page.goto('/')

    await page.locator('#nav-toggle').click()
    await expect(page.locator('#nav-links')).toBeVisible()
    await expect(page.locator('#nav-toggle')).toHaveAttribute('aria-expanded', 'true')

    await page.locator('#nav-toggle').click()
    await expect(page.locator('#nav-links')).toBeHidden()
  })

  test('E1.4 · las cuatro secciones son alcanzables desde el móvil', async ({ page }) => {
    /* El bug original: `.nav-links` se ocultaba en ≤980px sin reemplazo y las
       cuatro secciones quedaban inalcanzables. Se comprueba navegando a cada
       una, no solo que el enlace exista. */
    await page.setViewportSize(MOVIL)
    await page.goto('/')

    for (const destino of ['servicios', 'metodologia', 'arquitectura', 'cumplimiento']) {
      await page.locator('#nav-toggle').click()
      await page.locator(`#nav-links a[href="#${destino}"]`).click()

      await expect(page).toHaveURL(new RegExp(`#${destino}$`))
      await expect(page.locator(`#${destino}`)).toBeInViewport()
      // Y el panel debe cerrarse solo al navegar.
      await expect(page.locator('#nav-links')).toBeHidden()
    }
  })

  test('E1.5 · Escape cierra y devuelve el foco al toggle', async ({ page }) => {
    await page.setViewportSize(MOVIL)
    await page.goto('/')

    await page.locator('#nav-toggle').click()
    await expect(page.locator('#nav-links')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('#nav-links')).toBeHidden()
    await expect(page.locator('#nav-toggle')).toBeFocused()
  })

  test('E1.6 · pasar a escritorio con el menú abierto no deja el panel colgando', async ({ page }) => {
    /* Aquí sí se cruza el umbral de verdad, redimensionando la ventana; la
       unitaria solo podía invocar el handler a mano. */
    await page.setViewportSize(MOVIL)
    await page.goto('/')
    await page.locator('#nav-toggle').click()
    await expect(page.locator('#nav-links')).toBeVisible()

    await page.setViewportSize(ESCRITORIO)

    await expect(page.locator('#nav-toggle')).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#nav-links')).not.toHaveClass(/open/)
  })

  test('E1.7 · el toggle es operable con teclado', async ({ page }) => {
    await page.setViewportSize(MOVIL)
    await page.goto('/')

    await page.locator('#nav-toggle').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#nav-links')).toBeVisible()
  })
})

/* ── El logotipo de la barra cambia de imagen en pantallas estrechas ──────
   El logotipo completo mide 480×120 y a 40px de alto ocupa 160px; en un móvil
   de 360px eso es casi la mitad de la barra. Por debajo de 560px lo sustituye
   el isotipo, que ocupa 47px.

   Se comprueba con `currentSrc` y no con el marcado: `<source>` e `<img>`
   están los dos en el DOM en todos los anchos, así que afirmar sobre el HTML
   daría verde en ambos lados del umbral —una prueba que no puede fallar—.
   `currentSrc` es lo que el navegador decidió descargar de verdad. */
const ESTRECHO = { width: 560, height: 900 }  // último ancho con isotipo
const ANCHO = { width: 561, height: 900 }     // primero con logotipo completo

test.describe('E1 · logotipo adaptable de la barra', () => {
  const fuenteDelLogo = page => page.locator('.nav-logo img').evaluate(el => el.currentSrc)

  test('E1.8 · a 560px la barra muestra el isotipo', async ({ page }) => {
    await page.setViewportSize(ESTRECHO)
    await page.goto('/')

    expect(await fuenteDelLogo(page)).toMatch(/isotipo\.svg$/)
  })

  test('E1.9 · a 561px vuelve el logotipo completo', async ({ page }) => {
    /* El otro lado exacto del umbral, como en E1.1/E1.2: si alguien mueve el
       media query, uno de los dos cae y dice qué lado se rompió. */
    await page.setViewportSize(ANCHO)
    await page.goto('/')

    expect(await fuenteDelLogo(page)).toMatch(/logo_white_trans\.png$/)
  })

  test('E1.10 · el nombre accesible sobrevive al cambio de imagen', async ({ page }) => {
    /* Lo que se rompería sin darse cuenta: el `alt` vive en el `<img>` y el
       `<source>` no lo lleva. Si alguien reescribe esto con dos `<img>` y un
       `display:none`, el enlace puede quedarse sin nombre en un ancho y no en
       el otro. Se comprueba en ambos. */
    for (const viewport of [ESTRECHO, ANCHO]) {
      await page.setViewportSize(viewport)
      await page.goto('/')

      await expect(page.getByRole('link', { name: 'Higerotech — inicio' })).toBeVisible()
    }
  })
})
