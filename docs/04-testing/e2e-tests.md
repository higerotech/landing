# Pruebas E2E y de accesibilidad — Landing corporativa Higerotech

* **Estado:** **implementado** — 43 pruebas en verde
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.1.0
* **Gate:** 3 — **sigue no superado**: faltan rendimiento (Lighthouse), DAST y mutation testing
* **Herramientas:** Playwright (Chromium) + axe-core
* **Ejecución:** `npm run e2e` — ~15 s contra el contenedor

## Qué añade este nivel que el unitario no puede dar

Las 50 unitarias cargan el `index.html` real en jsdom, y eso cubre la lógica. Pero jsdom **no
tiene motor de layout, ni cascada CSS completa, ni aplica la CSP, ni sirve nada por HTTP**. Hay
una familia entera de defectos que estructuralmente no puede ver:

| Lo que solo un navegador contra nginx puede decir | Prueba |
|---|---|
| Que el breakpoint real sea 980/981px y no otro | E1.1, E1.2 |
| Que el atributo `hidden` **oculte de verdad** | E6.4 |
| Que la CSP se aplique y **bloquee** | E5.2, E5.3 |
| Que la página sin JS siga siendo legible | E4 |
| Que un 404 sea un 404 y no un 200 disfrazado | E3.1 |
| Que no salga ni una petición a terceros | E5.4 |
| Que el contraste y el árbol ARIA aguanten en ambos idiomas | E7 |

**Corren contra el contenedor**, no contra un servidor de ficheros. Es la diferencia entre
probar el artefacto y probar una aproximación suya: las cabeceras, los códigos de estado y la
CSP son los de nginx.

## El bug que encontraron en su primera ejecución

E4.5 falló nada más escribirse: con JavaScript desactivado, el botón de WhatsApp **se veía**.

La causa no estaba en el JS sino en la CSS. El botón lleva `hidden`, pero **la hoja no tenía
ninguna regla `[hidden]`**, y el `display` que el navegador aplica a ese atributo lo pisa
cualquier regla de autor que fije `display` — `.btn-secondary` usa `inline-flex`. Medido en
Chromium:

```
el.hidden = true  →  getComputedStyle(el).display === 'flex'   (altura > 0)
```

Consecuencia: durante todo el tiempo en que `CONTACT.whatsapp` estuvo vacío, el botón «Hablar
por WhatsApp» se publicaba con `href="#contacto"`, un enlace que salta a la sección donde ya
está. Exactamente el «CTA muerto» que el comentario del código dice querer evitar.

**Lo que hacía invisible el fallo:** la verificación registrada era `wa-cta.hidden === true`.
Una propiedad del DOM. La unitaria U8.1 la comprobaba en jsdom y pasaba —y sigue pasando, porque
es correcta—. Un atributo puesto no es un elemento oculto, y ninguna herramienta sin cascada
podía notar la diferencia.

Arreglado con `[hidden] { display: none !important; }`. Vigilado desde dos sitios: **E6.4** con
cascada real, y **U2.4**, que exige que la regla siga en la hoja. Registrado en el threat model
como corrección de T3.

## Catálogo

| Grupo | Pruebas | Qué protege |
|---|---|---|
| **E1** · Menú móvil | 7 | El breakpoint **real** 980/981px, las cuatro secciones alcanzables, `Escape` con retorno de foco, teclado. Primer bug de `7c7bc78` |
| **E2** · Idioma | 6 | Cambio visible, `?lang=en` compartible, persistencia tras recarga, cuatro ciclos sin pérdida, la etiqueta del toggle. Segundo bug |
| **E3** · Rutas y estados | 7 | 404 real con página propia, `robots`/`sitemap`, tipos MIME, dotfiles denegados, sin versión de nginx, **las cinco cabeceras en cuatro rutas**. Tercer bug |
| **E4** · Sin JavaScript | 5 | La prueba que ADR-0005 se propuso a sí mismo y nunca se escribió |
| **E5** · CSP y terceros | 6 | Que la política **bloquee**, cero peticiones externas, fuentes autoalojadas, consola limpia |
| **E6** · CTA y reveal | 6 | El botón publicado y seguro, `[hidden]` efectivo, la aparición progresiva |
| **E7** · Accesibilidad | 6 | axe-core en ES, EN, menú abierto y 404; un solo `h1` sin saltos; foco navegable |

### Decisiones que conviene tener escritas

**E4 no cubre T17.** «Sin JS» y «el JS lanza a mitad» son cosas distintas: el `<noscript>` actúa
en la primera y no en la segunda. E4 verifica la capa 1 de ADR-0005; T17 lo cubre U1.5.

**axe falla solo ante `serious` y `critical`.** Los `minor` y `moderate` se imprimen sin
bloquear. Un gate que salta por un aviso menor acaba ignorado, y entonces tampoco atrapa los
graves.

**E5.2 y E5.3 provocan una violación a propósito.** Sin ellas, E5.1 —«cero violaciones»— pasaría
igual con una CSP que no se aplicara: cero es también lo que se ve cuando no hay política.

**E6.5 recorre la página en pasos.** Saltar al final de golpe no revela lo intermedio:
`IntersectionObserver` dispara para lo que llega a intersecar, no para lo que se sobrevuela. La
primera versión saltaba y culpaba al sitio de un fallo que era del test.

**No se asserta que haya algún `.reveal` visible al cargar.** Medido: son **0 de 15**, porque el
primero nace a 1191px bajo un viewport de 900. Asertar «alguno» sería atarse a la altura del
hero; lo que importa es que no estén **todos**, que es lo que distingue al observer de la rama de
respaldo.

## Lo que este nivel tampoco cubre

| Fuera de alcance | A quién le toca |
|---|---|
| Rendimiento, LCP, peso de la primera carga | Lighthouse CI — **pendiente** |
| Seguridad dinámica sobre el sitio en marcha | ZAP baseline — **pendiente**, cierra el gate canónico DAST |
| Calidad de las propias pruebas | Mutation testing — **descartado por ahora** |
| Otros motores (Firefox, WebKit) | Solo Chromium. Un segundo motor multiplicaría el tiempo de CI para un sitio estático sin JS de terceros |
| **Que lo publicado sea esta imagen** | El paso 4 de verificación por el borde |

## En el CI

Job `E2E + accesibilidad`: `npm ci`, Chromium, construir la imagen, levantar el contenedor en
8080, `BASE_URL` apuntando ahí, y `npm run e2e`. En fallo sube el `playwright-report` como
artefacto durante 7 días.

Reconstruye la imagen en lugar de reutilizar el artefacto del job `build` porque necesita el
contexto completo y tarda lo mismo que descargarlo.

`forbidOnly` está activo en CI: un `test.only` olvidado dejaría el resto del archivo sin ejecutar
y el job en verde. Que falle.
