# Glosario / Lenguaje Ubicuo (DDD)

* **Estado:** approved
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 0.1.0
* **Contextos acotados:** Presentación · Internacionalización · Entrega · Marca

El vocabulario que aparece en el código, en la documentación y en el copy debe ser el mismo.
Cuando un término del negocio venezolano aparece en la página, aquí está su definición
exacta — no para el visitante, sino para quien mantiene el sitio y necesita saber si el
texto es correcto.

## Contexto: Presentación

| Término | Definición | Dónde vive |
|---|---|---|
| **Sección** | Bloque temático de la página con `id` propio y entrada en el menú. Son siete: dolores, servicios, metodología, arquitectura, cumplimiento, valores y contacto. | `<section class="block">` |
| **Token de diseño** | Variable CSS en `:root` que define color, radio, sombra o tipografía. Cambiar la marca es cambiar tokens, no reglas. | `index.html` `:root` |
| **Reveal** | Elemento que arranca invisible y aparece al entrar en el viewport. Requiere fallback: sin él la página queda vacía. | `.reveal` |
| **Isotipo** | Marca gráfica sin texto: tres hexágonos con un nodo coral. Distinto del **logotipo**, que incluye la palabra "Higerotech". | `assets/isotipo.svg` |
| **Tarjeta social** | Imagen 1200×630 que muestran WhatsApp, LinkedIn o X al compartir el enlace. | `assets/og-card.png` |

## Contexto: Internacionalización

| Término | Definición | Dónde vive |
|---|---|---|
| **Nodo i18n** | Elemento con `data-es` **y** `data-en`. Su contenido visible se reemplaza al cambiar de idioma. Hay 130. | `[data-es][data-en]` |
| **Idioma activo** | Idioma en curso. Se resuelve por prioridad: `?lang=` → `localStorage` → `es`. | `currentLang` |
| **Deriva de traducción** | Fallo en que el texto visible del HTML y su `data-es` divergen. Como `setLang()` corre al cargar, el texto visible se pierde de inmediato. Es la principal fuente de errores silenciosos del archivo. | — |

## Contexto: Entrega

| Término | Definición | Dónde vive |
|---|---|---|
| **Snippet de cabeceras** | Fragmento de nginx con las cabeceras de seguridad, incluido en **cada** `location`. No es duplicación: `add_header` no se hereda si el nivel declara la suya. | `security-headers.conf` |
| **Soft 404** | Responder 200 con la landing ante una URL inexistente. Los buscadores lo penalizan. Corregido: ahora devuelve 404 real. | `nginx.conf` |
| **Gate** | Punto de control AI-DLC que no se cruza sin evidencia. Seis, de 0 a 5. | `.ai-dlc/gates/` |

## Contexto: Marca y dominio del negocio

Términos venezolanos que aparecen en el copy. Se documentan porque un error factual aquí
daña la credibilidad del argumento comercial más que un bug de CSS.

| Término | Definición |
|---|---|
| **IGTF** | Impuesto a las Grandes Transacciones Financieras. Grava con **3 %** los pagos en divisas; los pagos en bolívares quedan al 0 %. En un pago mixto obliga a segregar la base imponible. Es el ejemplo que usa la página para ilustrar la fricción multimoneda. |
| **SUDEBAN** | Superintendencia de las Instituciones del Sector Bancario. Su **Resolución 001-21** exige auditoría inmutable, prevención AML/CFT y manuales de riesgo. |
| **AML/CFT** | Anti-Money Laundering / Combating the Financing of Terrorism. Prevención de legitimación de capitales y financiamiento al terrorismo. |
| **NIC 29 / NIIF 13** | Normas contables para economías hiperinflacionarias (NIC 29) y medición del valor razonable (NIIF 13). En inglés, IAS 29 / IFRS 13 — así aparece en la versión EN. |
| **Pago móvil interbancario** | Transferencia inmediata entre bancos venezolanos usando teléfono, cédula y banco. Canal dominante en bolívares. |
| **Edge-First** | Diseñar asumiendo que el enlace se cae: las mutaciones críticas se resuelven en local y se reconcilian después. No es lo mismo que "edge computing" como servicio de CDN. |
| **Bolt** | Ciclo de entrega de AI-DLC medido en horas, en lugar del sprint de semanas. |
| **Tríada AI-DLC** | Director (intención humana), Verificador (gobernanza y QA), Transformador (adaptación continua). |
| **CRDT** | *Conflict-free Replicated Data Type*. Estructura que fusiona historiales divergentes de forma determinista, sin coordinación. Sustenta la promesa de "consistencia eventual sin corrupción". |
| **SPOF** | *Single Point of Failure*. Punto único de fallo. Nota irónica: la propia landing tiene uno (R4 del charter). |
