/* E8 · Accesibilidad que axe no comprueba
   axe automatizado detecta como mucho un tercio de los criterios WCAG, y
   además devuelve `incomplete` —ni aprobado ni suspenso— cuando no puede
   calcular algo. Aquí se cubren esos huecos con medidas concretas.

   Ver `docs/04-testing/e2e-tests.md` §Accesibilidad más allá de axe. */

import { test, expect } from '@playwright/test'

const MOVIL_MINIMO = { width: 320, height: 640 }   // WCAG 1.4.10 Reflow
const ZOOM_200 = { width: 640, height: 512 }       // 1280×1024 al 200 %

test.describe('E8 · estructura y navegación por teclado', () => {
  test('E8.1 · el skip link existe, se oculta y funciona', async ({ page }) => {
    await page.goto('/')
    const skip = page.locator('.skip-link')

    // Fuera de pantalla, pero NO con display:none: debe seguir tabulable.
    const antes = await skip.evaluate(el => ({
      display: getComputedStyle(el).display,
      izquierda: el.getBoundingClientRect().left
    }))
    expect(antes.display).not.toBe('none')
    expect(antes.izquierda).toBeLessThan(0)

    // Primer Tab del documento.
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    expect(await skip.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0)

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#contenido$/)
  })

  test('E8.2 · los landmarks estructuran la página', async ({ page }) => {
    await page.goto('/')

    for (const sel of ['header', 'nav', 'main#contenido', 'footer']) {
      await expect(page.locator(sel), `falta el landmark ${sel}`).toHaveCount(1)
    }

    // Nada de contenido con texto debe quedar fuera de un landmark.
    const huerfanos = await page.evaluate(() => {
      const dentro = el => el.closest('header, nav, main, footer, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]')
      const noEsContenido = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
      return [...document.body.children]
        .filter(el => !noEsContenido.has(el.tagName))
        .filter(el => !dentro(el) && el.textContent.trim() && !el.classList.contains('skip-link'))
        .map(el => el.tagName.toLowerCase())
    })
    expect(huerfanos).toEqual([])
  })

  test('E8.3 · el foco se ve al navegar con teclado', async ({ page }) => {
    /* Un `outline: none` sin reemplazo deja a quien navega con teclado sin
       saber dónde está. WCAG 2.4.7. */
    await page.goto('/')

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const visible = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const cs = getComputedStyle(el)
        const anchoOutline = parseFloat(cs.outlineWidth) || 0
        return {
          etiqueta: el.tagName.toLowerCase(),
          tieneIndicador: (cs.outlineStyle !== 'none' && anchoOutline > 0) ||
                          cs.boxShadow !== 'none' ||
                          cs.textDecorationLine !== 'none'
        }
      })
      if (visible) {
        expect(visible.tieneIndicador, `sin indicador de foco en <${visible.etiqueta}>`).toBe(true)
      }
    }
  })

  test('E8.4 · el menú móvil no atrapa el foco', async ({ page }) => {
    await page.setViewportSize({ width: 980, height: 900 })
    await page.goto('/')
    await page.locator('#nav-toggle').click()

    // Doce tabulaciones deben poder salir del panel sin quedarse en bucle.
    const recorrido = []
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      recorrido.push(await page.evaluate(() => {
        const el = document.activeElement
        return el ? !!el.closest('#nav-links') : false
      }))
    }
    expect(recorrido.some(dentro => dentro === false), 'el foco no sale del menú').toBe(true)
  })
})

test.describe('E8 · adaptación de la presentación', () => {
  /** Desbordamiento aunque `overflow-x: hidden` lo esconda.
   *
   *  Solo cuenta lo que OBLIGARÍA a desplazarse: elementos con texto propio o
   *  interactivos. Se excluye la decoración pura —los anillos del hero miden
   *  340px y sobresalen 10px a 320px, recortados por `overflow-x: hidden`—
   *  porque WCAG 1.4.10 habla de contenido que exige scroll, y un adorno
   *  clipado no lo exige. Si algún día desborda un párrafo o un botón, eso sí
   *  aparece aquí. */
  async function desbordan (page) {
    return page.evaluate(() => {
      const ancho = document.documentElement.clientWidth
      const INTERACTIVO = 'a, button, input, select, textarea, [tabindex]'

      const importa = el => {
        if (el.closest('[aria-hidden="true"]')) return false
        if (el.matches(INTERACTIVO)) return true
        return [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      }

      return [...document.querySelectorAll('body *')]
        .filter(el => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > ancho + 1 && importa(el)
        })
        .slice(0, 5)
        .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} (right=${Math.round(el.getBoundingClientRect().right)} > ${ancho})`)
    })
  }

  test('E8.5 · a 320px no hay desbordamiento horizontal', async ({ page }) => {
    /* WCAG 1.4.10. `body { overflow-x: hidden }` oculta el síntoma pero no el
       problema: se mide por geometría de los elementos, no por el scroll. */
    await page.setViewportSize(MOVIL_MINIMO)
    await page.goto('/')
    expect(await desbordan(page)).toEqual([])
  })

  test('E8.6 · al 200 % de zoom el contenido sigue cabiendo', async ({ page }) => {
    // WCAG 1.4.4: equivale a 1280×1024 ampliado al doble.
    await page.setViewportSize(ZOOM_200)
    await page.goto('/')

    expect(await desbordan(page)).toEqual([])
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('#contacto .cta-title')).toBeVisible()
  })

  test('E8.7 · se respeta prefers-reduced-motion', async ({ page }) => {
    /* WCAG 2.3.3. Además es la tercera capa de ADR-0005: quien pide movimiento
       reducido debe ver el contenido sin depender del observer. */
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const opacidades = await page.locator('.reveal').evaluateAll(
      els => els.map(el => getComputedStyle(el).opacity)
    )
    expect(opacidades.filter(o => o !== '1')).toEqual([])

    const transiciones = await page.locator('.reveal').evaluateAll(
      els => els.map(el => getComputedStyle(el).transitionDuration)
    )
    expect(transiciones.every(t => parseFloat(t) <= 0.05), `transiciones: ${transiciones[0]}`).toBe(true)
  })
})

test.describe('E8 · contraste que axe no puede calcular', () => {
  test('E8.8 · el texto del hero cumple el mínimo de contraste', async ({ page }) => {
    /* axe devuelve `incomplete` para 13 nodos del hero —«background color could
       not be determined due to a pseudo element»—, e incompleto NO es aprobado.
       Aquí se resuelve el fondo efectivo subiendo por los ancestros, como haría
       axe, y se tratan aparte los textos recortados sobre degradado
       (`-webkit-text-fill-color: transparent`), cuyo color visible son los
       extremos del degradado y no la propiedad `color`. */
    await page.goto('/')

    const medidas = await page.evaluate(() => {
      const aRGB = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
      const opaco = s => {
        const m = s.match(/[\d.]+/g)
        return m && (m.length < 4 || parseFloat(m[3]) > 0.95)
      }
      const fondoEfectivo = el => {
        let n = el
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor
          if (opaco(bg)) return aRGB(bg)
          n = n.parentElement
        }
        return aRGB(getComputedStyle(document.body).backgroundColor)
      }
      const hex = h => { h = h.replace('#', '').trim(); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) }
      const raiz = getComputedStyle(document.documentElement)

      const objetivos = ['h1', '.hero-title .grad', '.hero-subtitle', '.stat-value',
        '.hero .btn-primary span', '.hero .btn-secondary span']

      return objetivos.map(sel => {
        const el = document.querySelector(sel)
        if (!el) return null
        const cs = getComputedStyle(el)
        const fondo = fondoEfectivo(el)
        const tam = parseFloat(cs.fontSize)
        const grande = tam >= 24 || (tam >= 18.66 && Number(cs.fontWeight) >= 700)

        // Texto recortado sobre degradado: se miden ambos extremos.
        const recortado = /transparent|rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor)
        const colores = recortado
          ? [hex(raiz.getPropertyValue('--teal')), hex(raiz.getPropertyValue('--sage'))]
          : [aRGB(cs.color)]

        return { sel, colores, fondo, minimo: grande ? 3 : 4.5 }
      }).filter(Boolean)
    })

    const lum = c => {
      const [r, g, b] = c.map(v => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a, b) => {
      const l1 = lum(a); const l2 = lum(b)
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    }

    expect(medidas.length, 'no se encontró ningún nodo del hero').toBeGreaterThan(0)

    const fallos = []
    for (const m of medidas) {
      for (const color of m.colores) {
        const r = ratio(color, m.fondo)
        if (r < m.minimo) fallos.push(`${m.sel}: ${r.toFixed(2)} < ${m.minimo}`)
      }
    }
    expect(fallos).toEqual([])
  })
})
