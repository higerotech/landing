# ADR-0008: Páginas legales con un archivo por idioma, no con `data-es`/`data-en`

* **Estado:** accepted
* **Fecha:** 2026-09-16
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 1.0.0
* **ID:** ADR-0008
* **Supersede / Superseded-by:** — (depende de **ADR-0007**: sin el JS extraído, esta decisión obligaría a duplicar el script cinco veces)
* **Controles OWASP afectados:** A05

## Contexto

El sitio publica cuatro documentos legales: política de privacidad, términos de uso, aviso de
cookies y política de IA responsable. Son el documento D1, D2, D11 y D6 de la investigación de
marco legal, y el owner decidió publicarlos en castellano e inglés.

La landing resuelve el bilingüismo con **un solo archivo y atributos `data-es`/`data-en`**: cada
nodo lleva sus dos versiones y `setLang()` reescribe el `innerHTML` al conmutar. Funciona bien
para lo que es —cadenas cortas, muchas, en una sola página— y tiene una ventaja real: conmutar
no recarga.

Aplicar ese mismo patrón a los documentos legales parecía lo coherente, y fue la primera
decisión tomada. **La investigación de marco legal cambió una premisa**, y con ella la decisión:

> Si se publica en inglés, la versión castellana debe declararse **prevalente**.

Eso, unido al volumen, convierte el patrón de la landing en el mecanismo equivocado:

- **Volumen.** Los cuatro documentos rondan las 9.000 palabras por idioma. Con
  `data-es`/`data-en`, cada párrafo existe **tres veces** en el archivo: el visible, el atributo
  español y el atributo inglés.
- **Riesgo R2 a otra escala.** El riesgo documentado en el charter es *«editar el HTML visible
  sin tocar `data-es` borra el cambio al cargar»*. En la landing eso estropea un titular. En una
  política de privacidad, deja publicado un texto que dice una cosa y otro que dice otra, **y uno
  de los dos tiene efectos jurídicos**.
- **Legibilidad de la revisión.** Un abogado tiene que poder leer el documento y compararlo con
  su traducción. Dos archivos se ponen lado a lado; 9.000 palabras dentro de atributos HTML no se
  revisan.
- **Prevalencia.** Con un solo archivo que conmuta en caliente, las dos versiones son el mismo
  documento y ninguna es «la que vale». Con dos archivos, cada uno declara su idioma, su
  canónica y su prevalencia.

## Decisión

**Un archivo por documento y por idioma: ocho archivos.** La versión castellana es la única que
produce efectos; la inglesa es traducción de cortesía y lo dice en su propio texto.

```
privacidad.html      ↔  privacy.html
terminos.html        ↔  terms.html
cookies.html         ↔  cookie-notice.html
ia-responsable.html  ↔  responsible-ai.html
```

Cinco decisiones de detalle:

1. **El conmutador ES/EN navega, no reescribe.** La página declara
   `<html lang="es" data-idioma-fijo data-href-es="…" data-href-en="…">` y `assets/sitio.js`
   guarda la preferencia y hace `location.assign()` al par. El cromo —barra, pie, menú— sigue
   siendo bilingüe con `data-es`/`data-en`: son cadenas cortas y ahí el patrón de la landing es
   el adecuado.

2. **Al cargar manda el idioma del documento, no la preferencia guardada.** Quien tenga elegido
   el inglés y llegue por un enlace directo a `privacidad.html` verá el documento en castellano,
   que es el que produce efectos, y **esa visita no le cambia la preferencia**. Aplicar el inglés
   dejaría el cromo traducido sobre un texto legal en español y un `<html lang>` que miente.

3. **Los enlaces internos llevan `.html`; las URL canónicas no.** Es la divergencia medida entre
   los dos caminos a producción: el Worker (`html_handling: auto-trailing-slash`) redirige
   `/privacidad.html` a `/privacidad`, y nginx (`try_files $uri $uri/ =404`) sirve **solo**
   `/privacidad.html` y da 404 en la extensionless. Un enlace con `.html` funciona por los dos
   caminos; una canónica sin extensión es la URL del camino canónico. Por eso el conmutador **no**
   usa el `hreflang`: ese lleva la canónica y no serviría para navegar por el camino de
   contingencia.

4. **CSS compartido en `assets/legal.css`.** Ocho copias del mismo bloque de estilos serían la
   deriva que U2.5 y U12 existen para impedir. Los tokens de `:root` sí se duplican desde
   `index.html` —la landing no puede depender de un archivo externo para pintar su primera
   vista— y de eso se encarga una comparación en pruebas.

5. **Ni `legal.css` ni `sitio.js` se cachean como el resto de `/assets/`.** Ese directorio se
   sirve `immutable` 30 días y el HTML se revalida siempre; los dos tienen su `location =` propio
   en `nginx.conf`. **U12.5** comprueba las dos reglas.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo |
|---|---|---|---|
| **Un archivo por idioma (elegida)** | Cada versión declara su idioma, su canónica y su prevalencia; se revisan lado a lado; el texto no vive en atributos | Ocho archivos en vez de cuatro; el conmutador necesita una rama nueva en `sitio.js`; conmutar recarga | Bajo, y acotado por las 38 aserciones de U13 |
| `data-es`/`data-en` como la landing | Cuatro archivos; conmutar no recarga; cero cambios en `sitio.js` | Cada párrafo legal existe tres veces; R2 sobre documentos con efectos jurídicos; imposible declarar una versión prevalente; irrevisable por un abogado | **Alto** |
| Solo castellano | Cero deriva bilingüe; además publicar en inglés pesa en el análisis de «dirigirse a» personas de la UE (art. 3.2 RGPD) | Incoherente con una landing que ofrece EN; un cliente internacional no puede leer los términos que se le aplican | Medio |
| Un documento con las dos versiones una detrás de otra | Un archivo, prevalencia declarable | El doble de largo para todo el mundo; nadie lee el idioma que no entiende | Bajo, pero mala lectura |

Sobre la tercera: es la única que reduce riesgo regulatorio en vez de aumentarlo, y por eso se
consideró en serio. Se descarta porque el sitio ya se dirige a un público bilingüe en todo lo
demás, y unos términos que el cliente no puede leer no lo protegen a él ni a Higerotech.

## Consecuencias

**Positivas**

- **La versión que vale está declarada** en las ocho páginas, y una prueba lo vigila (U13.9).
- **Los documentos son revisables** por alguien que no lea HTML.
- **El texto legal no vive en atributos**: se acabó el escapado de comillas y apóstrofos dentro
  de `data-*`, y el riesgo R2 no alcanza a estos documentos.
- **Cada versión es indexable por separado**, con su canónica y su `hreflang`.

**Negativas / deuda asumida**

- **Ocho archivos que comparten cromo.** La barra, el pie y el `<head>` están duplicados. No es
  el texto legal, pero es duplicación: si mañana cambia un enlace del pie, hay que tocarlo ocho
  veces. **U13.1, U13.7, U13.8 y U13.10** lo convierten en algo que falla ruidosamente en vez de
  derivar en silencio. Si el cromo empieza a doler de verdad, el siguiente paso es un pequeño
  generador o incluirlo desde el borde, y entonces tocará otro ADR.
- **Conmutar de idioma recarga la página.** En un documento legal es aceptable: no se está
  hojeando.
- **Los tokens de `:root` están en dos sitios**, `index.html` y `assets/legal.css`.
- **`sitio.js` tiene una rama más.** El modo de idioma fijo es lógica que la landing nunca
  ejecuta, y por tanto código que solo las pruebas de las páginas legales cubren. De ahí U13.4,
  U13.5 y U13.6.
- **Añadir un quinto documento legal son dos archivos y una fila** en la tabla `DOCUMENTOS` de
  `tests/unit/u13-paginas-legales.test.mjs`. Está diseñado así a propósito: esa tabla es la
  especificación, y las diez pruebas cubren lo que se le añada.

**Impacto en el threat model**

- **T17** (excepción temprana deja la página en blanco) se extiende a ocho páginas más. La
  mitigación es la misma y ahora es explícita: U13.1 exige los cinco `id` que `sitio.js`
  desreferencia sin guarda, y U13.2 carga cada página y comprueba que el script llegue al final.
- **R2** (deriva del texto bilingüe) **deja de aplicar a estos cuatro documentos**, por
  construcción. Sigue aplicando al cromo y a la landing.

## Nota sobre el contenido, que no es cosa de este ADR

Esta decisión es de arquitectura. El contenido de los cuatro documentos sale de
`docs/00-project/legal/investigacion-marco-legal.md` y **necesita revisión de un abogado
venezolano** antes de considerarse definitivo, especialmente en lo que toca a clientes regulados
por SUDEBAN. Los campos de identificación de la entidad están como `<TODO>` a propósito: no se
inventa una razón social.
