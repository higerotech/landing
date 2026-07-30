# ADR-0005: La página debe seguir siendo legible sin JavaScript

* **Estado:** accepted
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 1.0.0
* **ID:** ADR-0005
* **Supersede / Superseded-by:** —
* **Controles OWASP afectados:** A10

## Contexto

La animación de aparición al hacer scroll se implementaba así:

```css
.reveal { opacity: 0; transform: translateY(26px); transition: …; }
.reveal.in { opacity: 1; transform: none; }
```

```js
const io = new IntersectionObserver(…);
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
```

Quince elementos `.reveal` cubren todo el contenido salvo la barra de navegación, el hero y
el pie. La clase `in` la añade exclusivamente el `IntersectionObserver`.

Si el JavaScript no se ejecuta —deshabilitado, bloqueado por una extensión, error de red al
cargar, o navegador sin `IntersectionObserver`— **el 80 % de la página queda invisible**. No
degradada: invisible. `opacity: 0` sobre contenido que sí está en el DOM, de modo que los
rastreadores lo leen pero una persona no ve nada.

Para un sitio cuyo argumento central es "sistemas que no se detienen jamás", que un fallo de
un único script deje la página en blanco es una contradicción difícil de defender.

## Decisión

Establecer como **requisito de diseño, no como mejora opcional**: el contenido debe ser
legible sin JavaScript. Tres capas de defensa:

1. `<noscript>` en el `<head>` que restaura la visibilidad de `.reveal`.
2. Rama de respaldo en JS: si `IntersectionObserver` no existe, se añade `in` a todos.
3. `@media (prefers-reduced-motion: reduce)` fuerza `.reveal { opacity: 1 }`, que además
   cumple WCAG 2.3.3.

La regla se generaliza al resto de comportamientos de cliente: `localStorage` bloqueado va
en `try/catch`, la webfont ausente cae a una pila del sistema, y el botón de WhatsApp sin
número configurado se oculta en lugar de publicar un enlace muerto. Ninguna de estas rutas
puede dejar la página inservible.

Queda anotado en `CONTRIBUTING.md` como regla que no se salta.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Tres capas de respaldo (elegida)** | Cubre JS deshabilitado, navegador antiguo y preferencia de movimiento reducido | Tres sitios que mantener coherentes | Ninguno |
| Solo `<noscript>` | Una línea | No cubre el caso "JS activo pero `IntersectionObserver` ausente ni error de ejecución" | Ninguno |
| Eliminar `.reveal` y mostrar todo siempre | Imposible de romper | Se pierde una parte notable del acabado visual del sitio | Ninguno |
| Invertir la lógica: `in` por defecto, JS lo quita al cargar | Robusto por construcción; sin JS todo se ve | Provoca un parpadeo visible: el contenido aparece y se oculta antes de animar | Ninguno, pero peor percepción |

La cuarta opción es conceptualmente la más limpia (*progressive enhancement* real) y se
descartó solo por el parpadeo. Merece reconsiderarse si alguna vez se extrae el JS a un
archivo con `defer`, donde el intervalo sería mayor y el parpadeo más visible — lo que
inclinaría la balanza hacia hacerlo bien desde el CSS.

## Consecuencias

**Positivas**
- La página informa aunque falle todo lo prescindible. Es la propiedad que el sitio predica.
- Beneficio colateral en accesibilidad: quien pide movimiento reducido recibe el contenido
  completo, sin animaciones y sin los dos anillos que giran en bucle infinito en el hero.
- Mejor comportamiento ante bloqueadores de scripts, frecuentes en entornos corporativos.

**Negativas / deuda asumida**
- La regla se sostiene por disciplina y revisión, no por una prueba automatizada. Es
  exactamente el tipo de arreglo que una edición futura puede deshacer sin darse cuenta.
  Mitigación propuesta: prueba E2E de Playwright con JS deshabilitado que verifique que el
  texto de la última sección es visible. Registrada en
  [`.ai-dlc/gates/gate-3-testing.md`](../../../.ai-dlc/gates/gate-3-testing.md).

**Impacto en threat model**
- Cierra T7 (degradación no controlada, A10). Antes, un único fallo de script equivalía a
  una denegación de servicio del contenido para ese visitante.

## Nota de revisión — 2026-07-30

*Añadida sin modificar la decisión ni su historia; el ADR sigue `accepted`.*

La frase de arriba —«un único fallo de script equivalía a una denegación de servicio»— quedó
**demasiado fuerte en su forma pasada**. Sigue siendo cierta hoy para una clase de fallo: si el
script se ejecuta y **lanza** antes de la línea 978, ninguna de las tres capas lo alcanza.

| Capa | «El JS no se ejecuta» (T7) | «El JS lanza a mitad» (T17) |
|---|---|---|
| `<noscript>` | ✅ | ❌ Solo con el JS deshabilitado |
| Rama sin `IntersectionObserver` | ✅ | ❌ Vive **dentro** del script, línea 978 |
| `prefers-reduced-motion` | ✅ | ⚠️ Solo quien tenga esa preferencia |

La segunda fila es el hallazgo: la salvaguarda está en el mismo flujo que lo que protege, así
que una excepción en las líneas 919, 920, 972 o 973 la deja inalcanzable. No se ve leyendo la
lista de tres capas; hay que mirar el orden de ejecución.

El análisis de este ADR ya apuntaba en esa dirección: su tabla de alternativas nombra «error de
ejecución» como caso que `<noscript>` en solitario no cubre, y **la 4.ª alternativa —`in` por
defecto, que el JS retire— es robusta por construcción contra T17**. Se descartó solo por el
parpadeo. Registrado como amenaza T17 (DREAD 5,8) en `docs/02-design/threat-model.md` y como
riesgo R4 en los requisitos.

Consecuencia práctica: el argumento para reconsiderar la 4.ª alternativa es ahora más fuerte que
cuando se escribió el ADR. Entonces el contrapeso era el parpadeo; hoy al otro lado de la balanza
hay una amenaza abierta que las tres capas no cubren. Las unitarias U1/U2 de
`docs/04-testing/unit-tests.md` **detectan** el fallo antes de publicar, que no es lo mismo que
hacerlo imposible.
