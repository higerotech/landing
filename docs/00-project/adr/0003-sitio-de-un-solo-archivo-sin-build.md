# ADR-0003: Mantener el sitio en un solo archivo, sin build step ni dependencias

* **Estado:** accepted
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 1.0.0
* **ID:** ADR-0003
* **Supersede / Superseded-by:** —
* **Controles OWASP afectados:** A03, A05

## Contexto

`index.html` contiene el marcado, todo el CSS en un `<style>` y todo el JS en un `<script>`:
unas 900 líneas, ~80 KB. No hay `package.json`, ni bundler, ni framework.

Al endurecer la CSP apareció la tensión: el CSS y el JS inline obligan a
`script-src 'self' 'unsafe-inline'` y `style-src 'self' 'unsafe-inline'`. Con `'unsafe-inline'`
la CSP deja de proteger contra XSS reflejado o almacenado, que es su principal razón de ser.

Las salidas posibles son tres: extraer CSS/JS a archivos propios, usar hashes SHA-256 por
bloque inline, o aceptar `'unsafe-inline'`.

Hay un dato que cambia el peso del argumento: **el sitio no tiene ninguna entrada de usuario
que llegue al DOM**. Sin formularios, sin backend, sin contenido de terceros, el vector que
`'unsafe-inline'` deja abierto no tiene por dónde entrar. El único parámetro externo,
`?lang=`, se valida contra una allowlist de dos valores y nunca se interpola en el DOM.

## Decisión

Mantener el archivo único, sin build step ni dependencias de paquetes, y **aceptar
`'unsafe-inline'` como deuda registrada**.

El resto de la CSP se cierra todo lo posible para compensar: `default-src 'self'`,
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`.

Se registra el disparador que revierte esta decisión: **en cuanto el sitio incorpore una
entrada de usuario que llegue al DOM** —un formulario, un buscador, contenido de un CMS—
hay que extraer CSS y JS y eliminar `'unsafe-inline'`. La decisión es correcta para el
alcance actual, no en abstracto.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Archivo único + `'unsafe-inline'` (elegida)** | Cero dependencias; cero supply chain; editable con un editor de texto; una sola petición | CSP no protege de XSS | Bajo **en este alcance**: no hay vector de entrada |
| Extraer a `site.css` + `site.js`, CSP estricta | CSP real sin `'unsafe-inline'` | Tres peticiones en vez de una; revierte una decisión de arquitectura deliberada del proyecto | Ninguno |
| Hashes SHA-256 de los bloques inline | CSP estricta manteniendo el archivo único | El hash cambia con **cada** edición del CSS o del JS; sin build que lo recalcule, la primera edición rompe el sitio en silencio | **Alto**: fallo silencioso en producción |
| Adoptar un bundler (Vite/Astro) | Optimización automática, CSP estricta | Reintroduce `node_modules`: cientos de dependencias transitivas en un sitio que hoy tiene cero | **Alto**: A03 pasa de nulo a significativo |

Sobre la tercera opción: es la técnicamente "correcta" según el manual, y es justamente la
que peor encaja aquí. Sin pipeline que recalcule los hashes, cada cambio de una línea de CSS
rompería la página en producción sin error visible en el editor. Introduce un modo de fallo
que hoy no existe.

## Consecuencias

**Positivas**
- Superficie de supply chain (A03) prácticamente nula: la única dependencia externa es la
  imagen base de nginx. No hay lockfile que auditar ni dependencia alucinada posible.
- El sitio se puede editar y desplegar sin toolchain. Coherente con lo que vende: sistemas
  que no dependen de una cadena frágil para funcionar.
- Una sola petición HTML: la página es utilizable con el primer paquete de respuesta.

**Negativas / deuda asumida**
- `'unsafe-inline'` en `script-src` y `style-src`. Registrado como **T4 aceptado** en el
  threat model, no como control cumplido.
- El archivo tiene ~900 líneas y crece. Cuando el CSS supere lo manejable, la extracción
  se hará por legibilidad y de paso resolverá la CSP.
- Cada cadena existe tres veces (visible + `data-es` + `data-en`): 130 nodos i18n. Es la
  causa de la *deriva de traducción* descrita en el glosario.

**Impacto en threat model**
- T4 (XSS vía CSP permisiva): probabilidad baja por ausencia de vector de entrada, impacto
  alto si aparece uno. Score DREAD 5 — aceptado con disparador de revisión explícito.
