# Diseño del Sistema — Landing corporativa Higerotech

* **Estado:** approved
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 0.3.0
* **Gate:** 1
* **Estilo arquitectónico:** Sitio estático servido desde el borde — sin capas de aplicación
* **ADRs relacionadas:** ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006

## Nota sobre el estilo arquitectónico

AI-DLC prescribe Clean Architecture, DDD y separación en capas. **Aquí no aplican**, y
forzarlos sería peor que omitirlos: no hay lógica de dominio, ni casos de uso, ni
persistencia, ni puertos que invertir. Un `RespuestaService` con su `JuezPort` sobre una
página estática es ceremonia sin contenido.

Lo que sí se conserva del espíritu de esos principios es la **dirección de dependencias**:
el contenido no depende de nada externo; la presentación depende del contenido; el
comportamiento (JS) es una capa opcional encima que puede fallar sin arrastrar a las
anteriores. Esa es la separación real del sistema y es la que se documenta abajo.

## Contextos acotados (DDD)

| Bounded Context | Responsabilidad | Entidades núcleo |
|---|---|---|
| Presentación | Estructura, tokens visuales, respuesta a viewport | Sección, Token de diseño |
| Internacionalización | Alternar y persistir idioma sobre 130 nodos i18n | Nodo i18n, Idioma activo |
| Entrega | Servir con cabeceras, caché y códigos correctos | Ruta, Snippet de cabeceras |

Las fronteras son reales en el código: Presentación vive en `<style>`, i18n en `setLang()`
y sus consumidores, y Entrega íntegramente en `nginx.conf` + `security-headers.conf`. Un
cambio en Entrega no toca `index.html` y viceversa.

## Vista C4 — Container

```mermaid
C4Container
    title Contenedores — Landing corporativa Higerotech

    Person(prospecto, "Prospecto B2B", "Decisor de empresa venezolana")
    System_Ext(borde, "Borde de red", "Termina TLS. Fuera de este repositorio")

    System_Boundary(sitio, "Landing corporativa") {
        Container(nginx, "Servidor web", "nginx 1.30-alpine", "Sirve archivos estaticos, aplica cabeceras de seguridad y politica de cache")
        Container(pagina, "Documento de la pagina", "HTML + CSS + JS inline", "Todo el contenido, estilos y comportamiento en un archivo")
        Container(estaticos, "Recursos estaticos", "woff2, svg, png", "Fuentes autoalojadas, isotipo, logotipo, tarjeta social")
        Container(indexacion, "Archivos de indexacion", "robots.txt, sitemap.xml", "Directivas para rastreadores")
    }

    Container_Ext(navegador, "Navegador del visitante", "Chrome, Safari, Firefox", "Ejecuta el JS de la pagina y guarda la preferencia de idioma")

    Rel(prospecto, borde, "Visita el sitio", "HTTPS")
    Rel(borde, nginx, "Reenvia la peticion", "HTTP/1.1 puerto 80")
    Rel(nginx, pagina, "Lee del sistema de archivos", "")
    Rel(nginx, estaticos, "Lee del sistema de archivos", "")
    Rel(nginx, indexacion, "Lee del sistema de archivos", "")
    Rel(nginx, navegador, "Responde con cabeceras de seguridad", "HTTP + CSP")
    Rel(pagina, navegador, "Se renderiza y ejecuta en", "DOM")

    UpdateElementStyle(nginx, $bgColor="#1168bd", $fontColor="#ffffff")
    UpdateElementStyle(borde, $borderColor="#b30000", $fontColor="#b30000")
    UpdateRelStyle(borde, nginx, $textColor="#b30000", $lineColor="#b30000")
    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

*Eje estructura · Fase 02 · Qué piezas existen y con qué protocolo hablan.*

### Qué describe esta vista desde el 2026-07-31

**Los hostnames canónicos ya no pasan por aquí.** Desde el cutover de ADR-0006, `higerotech.com`
y `www` se sirven desde un Worker de Cloudflare con *static assets*, y esta vista describe el
**camino de contingencia**: el contenedor nginx tras el túnel, que sigue sirviendo `demo.` y
`web.`.

No se sustituye el diagrama por el del Worker, y la razón importa: **el contenedor no es un
camino muerto**. El suite completo y el escaneo DAST siguen corriendo contra él en cada PR, así
que el respaldo está verificado de forma continua — un respaldo sin probar es un respaldo que
falla el día que hace falta. La topología de los dos caminos está en
[el plan de despliegue](../05-deployment/plan-cloudflare-workers.md) §Topología objetivo.

Lo que **no** cambia con el Worker es la frontera de Entrega: las mismas cabeceras, el mismo 404
real y la misma política de caché, expresadas en `cloudflare/_headers` en vez de en
`security-headers.conf`. Que las dos definiciones no diverjan lo vigila la prueba **U12**.

## Vista C4 — Component

Se detalla `Documento de la página`, el único contenedor con internos no evidentes.

```mermaid
C4Component
    title Componentes — Documento de la pagina (index.html)

    Container_Boundary(pagina, "Documento de la pagina") {
        Component(tokens, "Tokens de diseno", "CSS custom properties en :root", "Color, radio, sombra, tipografia y sus respaldos")
        Component(secciones, "Secciones de contenido", "HTML semantico", "Siete bloques con id propio y 130 nodos bilingues")
        Component(i18n, "Motor de idioma", "JS - setLang()", "Reescribe los nodos i18n; prioridad query > localStorage > es")
        Component(menu, "Menu movil", "JS + CSS media query", "Panel desplegable bajo 980px con aria-expanded y cierre por Escape")
        Component(reveal, "Aparicion al scroll", "JS - IntersectionObserver", "Anade la clase in al entrar en viewport")
        Component(respaldos, "Capas de respaldo", "noscript + rama sin observer + prefers-reduced-motion", "Garantizan contenido visible si el JS no corre")
        Component(meta, "Metadatos de indexacion", "Open Graph, JSON-LD, hreflang", "Previsualizacion social y datos estructurados")
    }

    Container_Ext(navegador, "Navegador del visitante", "Motor de render", "")
    Container_Ext(fuentes, "Fuentes autoalojadas", "woff2 same-origin", "")

    Rel(secciones, tokens, "Toma color y tipografia de", "var()")
    Rel(tokens, fuentes, "Referencia via fonts.css", "@font-face")
    Rel(i18n, secciones, "Reescribe el contenido de", "innerHTML sobre data-es/data-en")
    Rel(menu, i18n, "Consulta el idioma activo para su etiqueta", "")
    Rel(reveal, secciones, "Revela progresivamente", "clase in")
    Rel(respaldos, reveal, "Neutraliza si el JS no corre", "CSS !important")
    Rel(meta, navegador, "Consumido por rastreadores", "")

    UpdateElementStyle(respaldos, $bgColor="#2d7d46", $fontColor="#ffffff")
    UpdateElementStyle(i18n, $borderColor="#b30000")
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

*Eje estructura · Fase 02 · Internos del documento.*

`Capas de respaldo` se destaca en verde porque es el componente que materializa RF07: sin
él, el fallo de cualquier otro deja la página en blanco. `Motor de idioma` lleva borde rojo
por ser el único sink `innerHTML` del sistema (ver A05).

## Flujos críticos (comportamiento)

Primera visita desde un enlace compartido en inglés — el camino que atraviesa más
componentes y donde el orden importa.

```mermaid
sequenceDiagram
    autonumber
    actor P as Prospecto
    participant B as Borde (TLS)
    participant N as nginx
    participant D as Documento
    participant F as Fuentes locales
    participant L as localStorage

    P->>B: GET /?lang=en (HTTPS)
    B->>N: GET /?lang=en (HTTP)
    N->>N: location / -> try_files -> index.html
    N->>N: include security-headers.conf
    N-->>B: 200 + CSP + XFO + nosniff + Referrer + Permissions
    B-->>P: HTML completo

    Note over D: El HTML ya es legible aqui.<br/>Todo lo siguiente es mejora.

    D->>F: preload inter-latin.woff2 + spacegrotesk-latin.woff2
    F-->>D: woff2 (same-origin, sin salto a terceros)

    D->>D: initWhatsApp() - CONTACT.whatsapp vacio
    Note over D: El boton queda oculto:<br/>no se publica un CTA muerto

    D->>D: idiomaInicial() lee ?lang=en
    D->>D: setLang('en') sobre 130 nodos i18n
    D->>L: guarda lang=en
    D->>D: html lang="en", aria-pressed sincronizado

    alt IntersectionObserver disponible
        D->>D: observa los 15 .reveal
    else No disponible
        D->>D: anade la clase in a todos
    end

    P-->>D: hace scroll
    D->>D: revela secciones al entrar en viewport
```

*Eje comportamiento · Fase 02 · Orden real de la primera visita.*

El paso 6 es el que cambió con ADR-0002: antes esa respuesta salía **sin ninguna cabecera de
seguridad**, porque `location = /index.html` declaraba su propio `Cache-Control` y descartaba
la herencia del bloque `server`.

La nota tras el paso 7 marca la propiedad de diseño central: cuando el HTML llega, la página
ya cumple su función. Fuentes, idioma y animaciones son mejoras sobre algo que ya sirve.

## Ciclo de vida de la entidad núcleo

La entidad núcleo es el **Nodo i18n**: el elemento que porta el contenido bilingüe. Su ciclo
explica tanto el funcionamiento normal como el modo de fallo más probable del sistema.

```mermaid
stateDiagram-v2
    [*] --> Autorado: el editor escribe el HTML
    Autorado --> Sincronizado: texto visible == data-es

    Sincronizado --> RenderES: setLang('es') al cargar
    Sincronizado --> RenderEN: setLang('en') al cargar

    RenderES --> RenderEN: el visitante pulsa EN
    RenderEN --> RenderES: el visitante pulsa ES

    Autorado --> Derivado: se edita el visible sin tocar data-es
    Derivado --> ContenidoPerdido: setLang() corre al cargar
    ContenidoPerdido --> Sincronizado: se corrige data-es

    RenderES --> Huerfano: un [data-es] padre reescribe su innerHTML
    Huerfano --> Descartado: isConnected lo detecta y lo omite

    Descartado --> [*]
    RenderES --> [*]
    RenderEN --> [*]

    note right of ContenidoPerdido
        Fallo silencioso y principal
        riesgo del archivo: el cambio
        desaparece sin error, porque
        setLang() corre al arrancar
    end note

    note right of Huerfano
        Hoy no hay nodos anidados.
        La guarda isConnected evita
        que el dia que los haya se
        pierda contenido sin aviso
    end note
```

*Eje comportamiento · Fase 02 · Ciclo de vida del nodo i18n y sus dos rutas de fallo.*

## Modelo de datos y dominio

No hay base de datos. El "modelo de datos" es la estructura del contenido, relevante porque
define qué debe mantenerse coherente al editar.

```mermaid
erDiagram
    PAGINA ||--|{ SECCION : contiene
    SECCION ||--|{ NODO_I18N : incluye
    NODO_I18N ||--|| TRADUCCION_ES : "data-es"
    NODO_I18N ||--|| TRADUCCION_EN : "data-en"
    PAGINA ||--|{ RECURSO : referencia
    PAGINA ||--|| METADATOS : declara

    PAGINA {
        string idioma_activo
        string canonical
    }
    SECCION {
        string id
        bool en_menu
        bool reveal
    }
    NODO_I18N {
        string selector
        bool tiene_html
    }
    RECURSO {
        string ruta
        string tipo
        bool same_origin
    }
    METADATOS {
        string og_title
        string og_image
        string jsonld_tipo
    }
```

*Eje estructura · Fase 02 · Estructura del contenido.*

La restricción que sostiene el sistema: `NODO_I18N` tiene **exactamente una** `TRADUCCION_ES`
y una `TRADUCCION_EN`. No es opcional. Un nodo con `data-es` pero sin `data-en` no lo
selecciona `querySelectorAll('[data-es][data-en]')` y queda congelado en español para siempre.

`RECURSO.same_origin` es invariante: debe ser verdadero para todos (ADR-0004).

```mermaid
classDiagram
    class MotorIdioma {
        -IDIOMAS: string[]
        -currentLang: string
        +setLang(lang) void
        +idiomaInicial() string
        -validar(lang) string
    }
    class MenuMovil {
        -navToggle: HTMLElement
        -navLinks: HTMLElement
        +setMenu(abierto) void
        +syncToggleLabel() void
    }
    class AparicionScroll {
        -observer: IntersectionObserver
        +iniciar() void
        +respaldoSinObserver() void
    }
    class ConfiguracionContacto {
        +whatsapp: string
        +initWhatsApp() void
    }

    MenuMovil ..> MotorIdioma : lee currentLang
    AparicionScroll ..> AparicionScroll : degrada a respaldo
    note for ConfiguracionContacto "Punto unico de configuracion.\nSi whatsapp esta vacio el CTA\nno se publica."
```

*Eje estructura (nivel Code) · Fase 02 · Únicamente donde la estructura no es evidente.*

`MotorIdioma` no depende de `MenuMovil`: la dependencia va en un solo sentido. Por eso
`setLang()` puede llamar a `syncToggleLabel()` sin acoplar el idioma al menú.

## Contratos

El sistema **no expone API**. El contrato observable es el conjunto de rutas HTTP servidas,
sus códigos y sus cabeceras. Se documenta aquí porque es lo que el pipeline verifica.

| Ruta | Método | Código | `Content-Type` | `Cache-Control` | Cabeceras de seguridad |
|---|---|---|---|---|---|
| `/` | GET | 200 | `text/html` | `no-cache, must-revalidate` | Completas |
| `/index.html` | GET | 200 | `text/html` | `no-cache, must-revalidate` | Completas |
| `/assets/**` | GET | 200 | según extensión | `public, max-age=2592000, immutable` | Completas |
| `/assets/<inexistente>` | GET | **404** | `text/html` | — | Completas |
| `/robots.txt` | GET | 200 | `text/plain` | `max-age=86400` | Completas |
| `/sitemap.xml` | GET | 200 | `text/xml` | `max-age=86400` | Completas |
| `/<cualquier-otra>` | GET | **404** | `text/html` | — | Completas |
| `/.git/config`, `/.env` | GET | **403** | — | — | — |

"Cabeceras de seguridad completas" = `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.

Contrato verificado con la imagen construida el 2026-07-29; el job `headers` del pipeline
lo comprueba en cada PR.

## Patrones de seguridad seleccionados (por amenaza DREAD priorizada)

| Amenaza | Patrón / Control | OWASP | ADR |
|---|---|---|---|
| T1 · Cabeceras ausentes por herencia de `add_header` | Snippet incluido explícitamente en cada `location` + verificación en CI | A02 | ADR-0002 |
| T2 · Clickjacking / suplantación por enmarcado | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | A02 | ADR-0002 |
| T3 · MIME sniffing | `X-Content-Type-Options: nosniff` | A02 | ADR-0002 |
| T4 · XSS con CSP permisiva | CSP cerrada salvo `'unsafe-inline'`; **riesgo aceptado** con disparador de revisión | A05 | ADR-0003 |
| T5 · Compromiso de recurso de terceros | Eliminado: todo same-origin | A03, A08 | ADR-0004 |
| T6 · Fingerprinting del servidor | `server_tokens off` | A02 | ADR-0002 |
| T7 · Degradación no controlada (página en blanco) | Tres capas de respaldo | A10 | ADR-0005 |
| T8 · Enumeración de rutas y archivos ocultos | 404 real + `location ~ /\.` + `.dockerignore` | A01, A02 | ADR-0002 |

El análisis STRIDE completo y los scores DREAD numéricos están en
[`threat-model.md`](threat-model.md).
