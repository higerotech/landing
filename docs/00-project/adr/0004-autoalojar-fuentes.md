# ADR-0004: Autoalojar las fuentes y eliminar toda dependencia de CDN

* **Estado:** accepted
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 1.0.0
* **ID:** ADR-0004
* **Supersede / Superseded-by:** —
* **Controles OWASP afectados:** A03, A08, A02

## Contexto

El `<head>` cargaba Inter (seis pesos) y Space Grotesk (cuatro) desde Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&…" rel="stylesheet" />
```

Cuatro problemas, en orden de importancia:

1. **Contradicción con el argumento comercial.** El sitio vende arquitecturas Edge-First a
   un mercado con conectividad intermitente, y su propio primer render quedaba bloqueado por
   una hoja de estilos en un dominio de terceros. Es el fallo más caro: no es técnico, es
   de credibilidad.
2. **Supply chain (A03/A08).** Un tercero controlaba un recurso bloqueante del render.
3. **Privacidad.** La petición a `fonts.gstatic.com` expone la IP del visitante a Google.
   Tribunales alemanes lo han considerado incumplimiento de GDPR. Para una empresa cuya
   página tiene una sección titulada "Cumplimiento por diseño", es un detalle incómodo.
4. **CSP.** Obligaba a abrir `style-src` y `font-src` a dominios externos.

Además se pedían seis pesos de Inter cuando el CSS solo usa cuatro (400, 500, 600, 700);
verificado por inspección de todas las declaraciones `font-weight` del archivo.

## Decisión

Descargar los `.woff2` y servirlos desde `assets/fonts/`, con `fonts.css` propio.

Tres detalles que importan:

- **Fuentes variables.** Google sirve Inter y Space Grotesk como variables: los cuatro pesos
  apuntaban al *mismo* archivo. Verificado por hash SHA-256 — los cuatro descargados por peso
  eran byte a byte idénticos. Se guarda un archivo por familia y subset, declarado con
  `font-weight: 400 700` (rango), en lugar de cuatro `@font-face` duplicados.
- **Subsets `latin` y `latin-ext`.** Se guardan ambos (175 KB en repositorio), pero
  `unicode-range` hace que un visitante ES/EN descargue **solo `latin`** (~70 KB). El coste
  en repositorio no es coste en ancho de banda.
- **`preload` de los dos subsets `latin`** para que el navegador los pida antes de resolver
  el CSS.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Autoalojar (elegida)** | Sin terceros; CSP cerrada; sin fuga de IP; sin punto de fallo externo | 175 KB versionados; actualizar la fuente es manual | Ninguno |
| Seguir con Google Fonts | Cero mantenimiento; posible caché compartida | Contradice el discurso del sitio; fuga de IP; render bloqueado por un tercero | Medio (A03/A08) |
| Google Fonts con carga no bloqueante (`media="print"` + `onload`) | Desbloquea el render con un cambio mínimo | No resuelve privacidad ni supply chain; provoca reflow al aplicar la fuente | Medio |
| Solo fuentes del sistema, sin webfonts | Cero bytes; instantáneo | Se pierde la identidad tipográfica de la marca | Ninguno |
| Subset por caracteres realmente usados (`pyftsubset`) | Bajaría de ~70 KB a ~25 KB | Requiere `fonttools` en el build; rompe si se añade una palabra con un glifo nuevo | Bajo, pero reintroduce toolchain (contra ADR-0003) |

## Consecuencias

**Positivas**
- Todo el sitio es **same-origin**. Esto es lo que hace posible `default-src 'self'` en la
  CSP (ADR-0002) y elimina la necesidad de SRI.
- El primer render ya no depende de dos handshakes TLS contra dominios ajenos.
- Se cargan 4 pesos en lugar de 10: menos bytes que antes, pese a autoalojar.
- Consistencia entre lo que el sitio dice y lo que hace.

**Negativas / deuda asumida**
- 175 KB de binarios versionados en git. Aceptable: cambian casi nunca.
- Actualizar a una versión nueva de Inter es un proceso manual. Se documenta el origen y la
  licencia (SIL OFL 1.1) en la cabecera de `fonts.css`.
- El glifo `≈` (U+2248), usado en la tarjeta de SLA, queda fuera de ambos subsets y cae a la
  fuente del sistema. **Es el mismo comportamiento que con el CDN**: no es una regresión.

**Impacto en threat model**
- Elimina T5 (compromiso de recurso de terceros) del análisis: sin terceros, sin amenaza.
- Habilita el cierre de T4 parcial: `font-src 'self'` en lugar de dominios externos.
