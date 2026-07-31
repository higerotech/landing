/* Configuración de las pruebas E2E.

   Corren contra el CONTENEDOR, no contra un servidor de ficheros: es la única
   forma de que las cabeceras de seguridad, los 404 reales y la CSP sean los de
   nginx y no una aproximación. Ver `docs/04-testing/e2e-tests.md`.

   Local:  `docker compose up -d` deja el sitio en http://localhost
   CI:     el job levanta el contenedor y fija BASE_URL al puerto que use */

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,

  /* En CI, `test.only` olvidado en un commit dejaría el resto del archivo sin
     ejecutar y el job en verde. Que falle. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* El sitio es same-origin y sin terceros: cualquier petición externa que
       aparezca en una traza es una regresión del ADR-0004. */
    ignoreHTTPSErrors: false
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ]
})
