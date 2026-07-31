/* E7 · Accesibilidad con axe-core
   Cierra el ítem de accesibilidad de la pirámide del gate 3. Corre dentro de
   Playwright, así que analiza el DOM ya renderizado, con la CSS aplicada y el
   JS ejecutado: el contraste real, no el teórico.

   Desde el 2026-07-31 el gate incluye las reglas de **buenas prácticas** y falla
   también ante `moderate`. Antes filtraba solo por etiquetas WCAG y exigía
   `serious`/`critical`, y esa doble rendija escondía 70 incidencias reales: 69
   de `region` —contenido fuera de todo landmark— y la ausencia de `<main>`.
   Corregidas con los landmarks y el skip link; el gate se sube para que no
   vuelvan a colarse. Solo se dejan pasar los `minor`, que se informan. */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const GRAVES = new Set(['moderate', 'serious', 'critical'])

/** Ejecuta axe y devuelve {graves, leves} ya separados. */
async function analizar (page, contexto = '') {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()

  const formatear = v =>
    `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo/s)` +
    (v.nodes[0] ? `\n      → ${v.nodes[0].target.join(' ')}` : '')

  const graves = violations.filter(v => GRAVES.has(v.impact)).map(formatear)
  const leves = violations.filter(v => !GRAVES.has(v.impact)).map(formatear)

  if (leves.length) {
    console.log(`\n  axe · avisos no bloqueantes${contexto ? ' — ' + contexto : ''}:`)
    leves.forEach(l => console.log('    ' + l))
  }

  return { graves, leves }
}

test.describe('E7 · accesibilidad', () => {
  test('E7.1 · la página en español no tiene violaciones', async ({ page }) => {
    await page.goto('/')
    const { graves } = await analizar(page, 'es')
    expect(graves).toEqual([])
  })

  test('E7.2 · la página en inglés tampoco', async ({ page }) => {
    /* El cambio de idioma reescribe con `innerHTML` 130 nodos: es donde un
       `aria-label` o un encabezado podrían perderse sin que nadie lo note. */
    await page.goto('/?lang=en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const { graves } = await analizar(page, 'en')
    expect(graves).toEqual([])
  })

  test('E7.3 · el menú móvil abierto tampoco', async ({ page }) => {
    await page.setViewportSize({ width: 980, height: 900 })
    await page.goto('/')
    await page.locator('#nav-toggle').click()
    await expect(page.locator('#nav-links')).toBeVisible()

    const { graves } = await analizar(page, 'menú móvil abierto')
    expect(graves).toEqual([])
  })

  test('E7.4 · la página 404 tampoco', async ({ page }) => {
    await page.goto('/ruta-inexistente')
    const { graves } = await analizar(page, '404')
    expect(graves).toEqual([])
  })

  test('E7.5 · hay un solo h1 y los encabezados no saltan niveles', async ({ page }) => {
    /* axe no comprueba el salto de niveles por defecto, y en una landing larga
       es el error de estructura más fácil de cometer. */
    await page.goto('/')

    const niveles = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(
      els => els.map(el => Number(el.tagName[1]))
    )

    expect(niveles.filter(n => n === 1).length, 'debe haber exactamente un h1').toBe(1)
    expect(niveles[0], 'el primer encabezado debe ser el h1').toBe(1)

    const saltos = []
    for (let i = 1; i < niveles.length; i++) {
      if (niveles[i] - niveles[i - 1] > 1) saltos.push(`h${niveles[i - 1]} → h${niveles[i]}`)
    }
    expect(saltos).toEqual([])
  })

  test('E7.6 · se puede navegar con el tabulador hasta el contenido', async ({ page }) => {
    await page.goto('/')

    const alcanzados = []
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      alcanzados.push(await page.evaluate(() => {
        const a = document.activeElement
        if (!a || a === document.body) return 'ninguno'
        /* Los enlaces del menú no tienen id: identificarlos solo por etiqueta
           haría que seis elementos distintos parecieran el mismo y el test
           diría «el foco no avanza» cuando sí avanza. */
        return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}:${(a.textContent || '').trim().slice(0, 24)}`
      }))
    }

    expect(alcanzados.every(e => e !== 'ninguno'), `foco perdido: ${alcanzados}`).toBe(true)
    expect(new Set(alcanzados).size, 'el foco no avanza').toBeGreaterThan(1)
  })
})
