/* E10 · Los assets de marca abiertos a otros orígenes
   Tres imágenes —isotipo en carbón, tarjeta social y logotipo— deben poder
   incrustarse desde fuera. El resto del sitio sigue cerrado con
   `Cross-Origin-Resource-Policy: same-origin`.

   Archivo aparte y no dentro de E9 por un motivo mecánico: E10.2 necesita
   `launchOptions`, y Playwright solo las admite a nivel de archivo o de
   configuración —«forces a new worker»—, nunca dentro de un `describe`.

   Las dos pruebas son dos niveles distintos de evidencia y hacen falta las
   dos: E10.1 mira lo que dice la respuesta, E10.2 mira lo que hace un
   navegador con ella. La segunda existe porque la cabecera puede estar bien
   escrita y aun así no servir — un valor DUPLICADO, que es exactamente lo que
   producía `cloudflare/_headers` al añadir una regla específica, deja al
   navegador sin política reconocible. */

import { test, expect } from '@playwright/test'

const PUBLICOS = [
  '/assets/isotipo_charcoal.svg',
  '/assets/og-card.png',
  '/assets/logo_white_trans.png'
]

/* El control negativo. Sin él, las dos pruebas darían verde aunque CORP no
   estuviera haciendo nada en absoluto. */
const CERRADO = '/assets/isotipo.svg'

/* El tercero desde el que se mira: una página sintética que sirve Playwright,
   no una del propio sitio. La distinción costó dos intentos y merece quedar
   escrita, porque las dos veces el rojo NO venía de CORP:

   1. Con un origen hermano del sitio (`127.0.0.1` frente a `localhost`) las
      imágenes no cargaban por **nuestra propia CSP**, que restringe `img-src`
      a `'self'`. Medía nuestra política, no la del recurso.
   2. Con un tercero en un dominio inventado, Chromium lo bloqueaba por
      **Private/Local Network Access**: un origen público no puede pedir a una
      dirección local. Nada que ver con el recurso tampoco.

   De ahí las dos decisiones: un tercero en loopback con otro puerto —origen
   distinto, misma clase de red— y las comprobaciones de red local
   desactivadas. Entre dos orígenes públicos, que es el caso real, ninguna de
   las dos cosas interviene. */
const TERCERO = 'http://127.0.0.1:19999'

/* No relaja nada del sitio: es una opción del navegador de pruebas, y solo
   para este archivo. */
test.use({
  launchOptions: {
    args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests']
  }
})

test.describe('E10 · assets abiertos a otros orígenes', () => {
  test('E10.1 · las cabeceras dicen lo que deben en cada asset', async ({ request }) => {
    for (const ruta of PUBLICOS) {
      const h = (await request.get(ruta)).headers()
      expect(h['cross-origin-resource-policy'], `${ruta} debería abrirse`).toBe('cross-origin')
      expect(h['access-control-allow-origin'], `${ruta} sin ACAO`).toBe('*')
    }

    /* La otra mitad: lo que NO se abrió. */
    const h = (await request.get(CERRADO)).headers()
    expect(h['cross-origin-resource-policy'], `${CERRADO} no debería abrirse`).toBe('same-origin')
    expect(h['access-control-allow-origin']).toBeUndefined()
  })

  test('E10.2 · un navegador en otro origen los carga de verdad', async ({ page, baseURL }) => {
    await page.route(`${TERCERO}/**`, ruta => ruta.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta charset="utf-8"><title>tercero</title>'
    }))
    await page.goto(`${TERCERO}/`)

    /* Se mira `onload` frente a `onerror`, y NO `naturalWidth`: el isotipo es
       un SVG con `viewBox` y sin `width`/`height`, así que no tiene tamaño
       intrínseco y Chromium reporta `naturalWidth === 0` aunque haya cargado
       perfectamente. Medir por el tamaño daba un rojo ajeno a CORP. */
    const cargada = ruta => page.evaluate(src => new Promise(resolver => {
      const img = new Image()
      img.onload = () => resolver(true)
      img.onerror = () => resolver(false)
      img.src = src
    }), baseURL + ruta)

    for (const ruta of PUBLICOS) {
      expect(await cargada(ruta), `${ruta} no cargó desde un tercero`).toBe(true)
    }

    expect(await cargada(CERRADO), `${CERRADO} cargó desde un tercero y no debía`).toBe(false)
  })
})
