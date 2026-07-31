# Presupuesto de rendimiento — Landing corporativa Higerotech

* **Estado:** **implementado** — presupuesto cumplido con margen
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.1.0
* **Gate:** 3 — solo queda **DAST**
* **Herramienta:** `lighthouse` + el Chromium que ya descargó Playwright
* **Ejecución:** `npm run perf` — ~1 min contra el contenedor

## El presupuesto

Sale del charter §Métricas de éxito, no de lo que la herramienta dé por bueno:

| Métrica | Objetivo | Medido (mediana) |
|---|---|---|
| LCP en **3G lento** | < 2 500 ms | **1 933 ms** |
| Peso de la primera carga | < 350 KB | **104 KB** |
| performance | ≥ 90 | 98 |
| accessibility | = 100 | 100 |
| best-practices | ≥ 95 | 96 |
| seo | = 100 | 100 |

## Tres decisiones de medición que cambian el resultado

### 1. Throttling real, no simulado

Lighthouse ofrece dos métodos. El **simulado** —el de por defecto— modela el grafo de
dependencias y estima; el **`devtools`** aplica la limitación de verdad. Para esta misma página,
el mismo día:

| Método | LCP |
|---|---|
| `simulate` (por defecto) | **5 260 ms** |
| `devtools` (real) | 2 478 ms |
| Medición directa con Playwright y CDP | 1 608 ms |

Con el simulado, el presupuesto quedaba «incumplido por más del doble» y estuvo a punto de
registrarse así. La diferencia entre los dos métodos de Lighthouse era de **3,6 segundos**. Se
usa `devtools` porque lo que se quiere saber es qué ve un visitante, no qué predice un modelo.

### 2. 3G lento de verdad

El preset móvil de Lighthouse es **Slow 4G**: 1 638 kbps y 150 ms de RTT. El charter dice **3G
lento**, que en DevTools son 400 kbps y 400 ms. Con el preset por defecto, el LCP sale 1,8 s y el
presupuesto «se cumple» — pero verificando una condición distinta de la declarada. El medidor
fija 400/400 explícitamente.

### 3. Mediana de tres ejecuciones

Cuatro medidas de la misma página, sin cambiar nada: **2 404 / 2 673 / 2 491 / 2 478 ms**. El
rango es de 270 ms y **cruza la línea de los 2 500**. Un gate sobre una sola ejecución habría
sido una moneda al aire: dos de esas cuatro lo suspenden.

## La optimización que hizo viable el gate

Con el presupuesto en 2 500 ms y una mediana de ~2 510, no había gate posible: cualquier umbral
o bloqueaba merges legítimos o no medía nada.

**Diagnóstico:** en todas las ejecuciones **FCP == LCP**, es decir, la página no pintaba nada
hasta tener el CSS. Y `assets/fonts/fonts.css` —2 KB— era una petición **externa y
render-blocking**: en un enlace con 400 ms de RTT, esos 2 KB costaban un round trip completo en
la cadena crítica.

**Cambio:** inlinar esas reglas `@font-face` en `index.html`. Es además lo que ADR-0003 ya
prescribe —el CSS vive dentro del HTML—, así que el archivo externo era la excepción.

| | LCP (3 ejecuciones) | performance |
|---|---|---|
| Antes | 2 404 / 2 673 / 2 491 ms | 94 |
| Después | **1 932 / 1 898 / 1 765 ms** | **98** |

**~645 ms menos**, y el margen bajo el presupuesto pasa del 0,9 % al 25 %.

### Lo que cuesta, dicho entero

`404.html` sigue enlazando `assets/fonts/fonts.css`, así que las mismas reglas viven ahora en
dos sitios **sin build que las sincronice** — exactamente la clase de deriva que este
repositorio lleva días corrigiendo. Se convierte en error detectable con la unitaria **U2.5**,
que compara el bloque inlinado con el archivo y falla si divergen.

El otro coste: esos 2 KB viajaban antes con `max-age=2592000, immutable` y ahora van dentro del
HTML, que es `no-cache`. Un visitante recurrente los recibe en cada visita. Para una landing
donde la mayoría de visitas son primeras, cambiar 2 KB repetidos por un round trip ahorrado es
un buen negocio; si algún día el patrón de uso fuera otro, este es el párrafo que hay que releer.

## Lo que el presupuesto no dice

- **No mide desde Venezuela.** Mide con una red 3G lenta emulada desde el runner. La latencia
  real hasta el borde de Cloudflare y desde ahí al visitante no entra aquí.
- **No mide el sitio publicado**, sino la imagen. Que lo publicado sea esta imagen lo comprueba
  el paso 4 de verificación por el borde.
- **`best-practices` está en 96, no 100.** Se gatea en 95 y no en el valor exacto de hoy: un
  umbral clavado en la medición actual falla al primer cambio inocuo.

## En el CI

Job `Presupuesto de rendimiento`: construye la imagen, levanta el contenedor en 8081, y corre
`npm run perf` contra él. Sube los informes JSON como artefacto **siempre**, no solo al fallar:
cuando un número se degrada, lo útil es comparar con el de la semana pasada.

Lighthouse reutiliza el Chromium que ya descarga Playwright vía `CHROME_PATH`; no se descarga un
segundo navegador.

## Nota sobre la herramienta

Se usa `lighthouse` y **no `@lhci/cli`**. El envoltorio de CI arrastra **323 paquetes** y **7
vulnerabilidades `high`** por su cadena `chrome-launcher → rimraf → glob → minimatch →
brace-expansion`, que `npm overrides` no alcanza porque lhci las fija: npm solo ofrece bajar a
`@lhci/cli@0.6.1`. Eso habría puesto el gate SCA en rojo, y la alternativa —relajar el gate—
era peor que el problema.

`lighthouse` a secas añade 115 paquetes y **cero vulnerabilidades**.
