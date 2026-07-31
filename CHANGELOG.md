# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido
- **Validado el gate DAST antes de darlo por bueno**, y aparecieron dos cosas. Primera: se midió
  qué recorre el escaneo de verdad —desde el log de nginx, no desde el informe de ZAP, que solo
  dice dónde se levantó cada alerta—. Son **8 URLs y 14 peticiones**, así que el spider funciona;
  pero **nunca pedía la página 404**, porque solo sigue enlaces y a `/404.html` no apunta ninguno:
  la sirve nginx ante una ruta inexistente. Punto ciego real sobre una página que los visitantes
  sí ven, corregido escaneando **dos objetivos**. Segunda: la afirmación «un baseline pasivo basta
  aquí» pasa de suposición a hecho medido — se ejecutó `zap-full-scan.py`, que **ataca** (SQLi,
  inyección de comandos, SSTI, path traversal, XSS, XXE): **140 reglas, más del doble que las 64
  del baseline, y ni un hallazgo nuevo**. Queda como comando bajo demanda
  (`npm run dast -- --activo`) y no como gate, porque en un sitio sin formularios ni API gastaría
  minutos por PR para confirmar lo mismo. **El disparador para volver a él está automatizado:**
  la premisa «no hay superficie de entrada» la vigila U11.1, así que el día que aparezca un
  formulario esa prueba se pone roja y avisa de que toca cambiar de escaneo.
- **Matriz de verificación OWASP Top 10**, con la trazabilidad categoría → prueba en
  `.ai-dlc/owasp-mapping.md`. Antes el mapeo describía controles sin decir quién los comprobaba:
  tres categorías no tenían ninguna prueba y dos descansaban en una premisa que nadie vigilaba.
  Ahora **nueve de diez** tienen verificación automatizada; la única sin ella es **A09**, y no
  por descuido — es la brecha abierta del Gate 5, no hay observabilidad que verificar.
- **14 pruebas nuevas** para cerrar esos huecos: 7 unitarias (**U11**) y 7 E2E (**E9**). Cubren
  la **premisa** de A01/A07 —sin formularios, sin entradas, sin cookies—, un payload real en
  `?lang` que el threat model daba por verificado en T12 y no lo estaba, las **directivas
  concretas** de la CSP —E5 comprobaba que la política se aplicara, no que conservara
  `frame-ancestors`, `object-src`, `base-uri` y `form-action`—, la versión de nginx y las cinco
  cabeceras **en una respuesta 404**, que es otro `location` y justo donde la herencia rota de
  `add_header` se cuela, la tríada COOP/COEP/CORP, el endurecimiento declarado en el compose, la
  pila de fuentes que nunca cae a serif, y el comportamiento ante un método y una ruta anómalos.
- **Pruebas de las categorías «No aplica».** A01 y A07 lo están porque no hay autenticación ni
  entradas de usuario, pero eso es una **premisa, no un control**. Este repositorio ya vio
  caducar una: el gate SCA estuvo en ✅ «por ausencia de dependencias» hasta que entró `jsdom`, y
  el ✅ no se movió solo. U11.1 y U11.2 hacen que la premisa falle en voz alta el día que aparezca
  un formulario, en vez de dejar que la etiqueta envejezca en silencio.
- **Mutation testing con Stryker: 92,36 %**, umbral propio en **90**, ejecución **semanal** en su
  propio workflow. Cierra el último checkbox del Gate 3. Con 100 % de cobertura de líneas y
  funciones, **encontró cinco huecos reales** donde las pruebas no habrían detectado el fallo:
  `Escape` robaba el foco con el menú cerrado —`aria-expanded` ya era `'false'`, así que la
  aserción existente no notaba nada—; cualquier tecla cerraba el menú; el handler de breakpoint
  cerraba también al salir de escritorio; y `idiomaInicial` podía devolver un idioma inválido sin
  que se notara, **porque `setLang` valida otra vez y el DOM acababa igual**. Cerrados con U7.5
  ampliada, U7.8, U7.9 y U4.8: el score subió de 88,19 % a 92,36 %. Son 54 unitarias.
- **DAST con ZAP baseline, gateado en el CI** (`npm run dast`): 0 fallos, 0 avisos nuevos, 64
  reglas en verde y 3 hallazgos aceptados con su motivo en `.zap/rules.tsv`. Cierra el último
  nivel de la pirámide del Gate 3 **y** el gate canónico `DAST` del Gate 4, que pasa de 5 a
  **6 de 7** — solo queda `license`. Se usa la imagen oficial por **Docker y no la acción de
  GitHub**, para que el comando sea el mismo en local y en CI: un gate que solo corre en el
  runner se depura a ciegas. Ventaja secundaria: no añade dependencias npm, así que el gate SCA
  no se entera; el mismo criterio que descartó `@lhci/cli`.
- **Verificado que el gate DAST puede ponerse en rojo**, y el primer intento enseñó algo. Quitar
  `X-Frame-Options` **no** produjo hallazgo: ZAP acepta `frame-ancestors 'none'` de la CSP como
  equivalente, así que el sitio seguía protegido y el gate tenía razón. Con
  `X-Content-Type-Options`, que no tiene sustituto, salta `WARN-NEW: 1` y sale con código 2.
  Comprobarlo con un solo caso habría dado la conclusión contraria y falsa.
- **Presupuesto de rendimiento con Lighthouse, gateado en el CI** (`npm run perf`). Comprueba las
  dos métricas que el charter declara: **LCP 1 933 ms** de mediana contra un objetivo de 2 500 en
  **3G lento**, y **104 KB** contra 350. Tres decisiones de medición que cambian el resultado y
  quedan escritas en `docs/04-testing/rendimiento.md`:
  **(1)** throttling **real** y no simulado — el simulado daba **5 260 ms** donde el navegador
  mide 1 608, una diferencia de 3,6 s que estuvo a punto de registrarse como «presupuesto
  incumplido»; **(2)** 3G lento **de verdad** (400 kbps / 400 ms) y no el preset móvil por
  defecto, que es Slow 4G y verifica una condición distinta de la declarada; **(3)** **mediana de
  tres ejecuciones**, porque cuatro medidas de la misma página dieron 2 404 / 2 673 / 2 491 /
  2 478 ms, un rango de 270 ms que cruza la línea del presupuesto.
- **Landmarks y skip link.** La página no tenía `<main>`, ni `<header>`, ni forma de saltarse la
  navegación con el teclado. Ejecutando axe **sin el filtro de etiquetas** aparecían **70
  incidencias**: 69 de `region` —contenido fuera de todo landmark— y `landmark-one-main`. Para
  quien usa lector de pantalla eso es no poder saltar al contenido ni moverse por regiones.
  Añadidos los tres; axe pasa a **cero violaciones con todas las reglas activas**.
- **8 pruebas de accesibilidad que axe no cubre** (grupo E8): skip link operativo (2.4.1),
  indicador de foco visible (2.4.7), sin trampa de foco en el menú móvil (2.1.2), reflow a 320px
  (1.4.10), zoom al 200 % (1.4.4), `prefers-reduced-motion` (2.3.3) y **el contraste de los 13
  nodos del hero que axe devolvía como «incompleto»** —ni aprobado ni suspenso— por no poder
  determinar el fondo tras un pseudo-elemento. Todos cumplen: se resuelve el fondo efectivo por
  la cadena de ancestros y, en el texto recortado sobre degradado, se miden **ambos extremos**
  (`--teal` 10,67 y `--sage` 8,76 sobre un mínimo de 3:1). Son 51 pruebas E2E.
- **43 pruebas E2E y de accesibilidad** con Playwright y axe-core (`npm run e2e`, ~15 s),
  **contra el contenedor** y no contra un servidor de ficheros: es lo que permite comprobar lo
  que jsdom no puede ver. Cubren el breakpoint **real** de 980/981px, la página **sin
  JavaScript** —la prueba que ADR-0005 se propuso a sí mismo y nunca se escribió—, que la CSP
  **bloquee** de verdad, el 404 de nginx, las cinco cabeceras en cuatro rutas, cero peticiones a
  terceros y axe-core en español, inglés, menú móvil abierto y página 404. Job obligatorio en el
  CI. Diseño en `docs/04-testing/e2e-tests.md`.
- **El botón de WhatsApp se publica**: `CONTACT.whatsapp = '13235543854'`. Cierra la dependencia
  **D2** y deja **RF05** verificado en sus dos ramas. Requiere **redesplegar**: el contenedor en
  producción sirve la versión sin botón.

### Corregido
- **Una medición mía que estuvo a punto de registrarse como hallazgo grave.** Al contar qué pedía
  ZAP, el log de nginx decía «4 peticiones, todas a `/`» — parecía que el escaneo no recorría
  nada. Era falso: `nginx.conf` tiene `access_log off` en assets, `robots.txt` y `sitemap.xml`,
  así que el propio log escondía el tráfico. Repetido contra un contenedor de un solo uso con
  registro completo, salieron las 8 URLs reales. La herramienta de medida formaba parte del
  sistema medido.
- **Dos afirmaciones caducas en el A03 del mapeo OWASP.** Decía «sin gestor de paquetes: cero
  dependencias de npm/pip, por tanto cero riesgo de dependencia transitiva» —falso desde que
  entraron las herramientas de prueba— y que `gitleaks-action` y `semgrep-action` seguían
  anclados por tag, cuando pasaron a SHA. Corregidas ambas: hoy hay dependencias **de
  desarrollo**, ninguna viaja en la imagen, y el riesgo pasó de inexistente a acotado al CI y
  vigilado por el gate SCA.
- **La razón por la que se saltaba el mutation testing había caducado, y el bloqueo técnico que
  se le suponía era falso.** Se había descartado con «lo primero era que existiera algo que
  mutar» —cierto entonces, obsoleto desde que hubo suite— y con la idea de que Stryker no puede
  mutar JavaScript incrustado en HTML. **Sí puede**: trae un `html-parser` que extrae los
  `<script>`, y uno sin `type` ni `src` se trata como JS. Lo que sí costó fueron tres obstáculos
  reales, cada uno con una causa distinta y ninguno deducible del mensaje de error: `node --test`
  emite `spec` y no TAP en Node 24; el script corre **dentro de jsdom**, otro *realm*, donde
  `globalThis` es la ventana y `process` no existe, así que ningún mutante se activaba y la
  cobertura no volvía a Node; y `node --test` usa **un proceso hijo por archivo**. Resueltos con
  `--test-reporter=tap`, un puente de realms en el arnés y `--experimental-test-isolation=none`.
  Los tres primeros intentos daban 0,00 %, que no era un score sino un artefacto.
- **Todas las acciones del CI pasan a runtime node24.** El job de secretos avisaba de que
  `actions/checkout@v4` y `gitleaks/gitleaks-action@v2` apuntan a Node 20 y se estaban forzando
  sobre Node 24. No es cosmético: GitHub **retira Node 20 de los runners el 2026-09-16** y a
  partir de ahí esas acciones dejan de funcionar. Actualizadas `checkout` v4→v6, `setup-node`
  v4→v6, `upload-artifact` v4→v7, `download-artifact` v4→v7 y `gitleaks-action` v2→v3.
  Dos comprobaciones que evitaron elegir mal: **`upload-artifact@v5` sigue siendo node20** pese
  a que sus notas de release dicen «supports Node v24.x», y `download-artifact` no llega a
  node24 hasta **v7** —v5 y v6 siguen en node20—, así que un salto «conservador» a v5 no habría
  resuelto nada. El criterio no fue coger la más nueva sino **la major más antigua que ya fuera
  node24 y llevara meses en circulación**: `checkout@v7` y `setup-node@v7` tenían 11 y 17 días.
  `gitleaks-action` v3 es una migración pura de runtime, sin cambios de entradas ni
  comportamiento; `semgrep-action` es de tipo docker y no le afectaba.
  Verificado además que **`GITLEAKS_LICENSE` sigue siendo necesaria**: depende de que el
  propietario sea una organización, no de que el repositorio sea público.
- **Un round trip de más en la cadena crítica: −645 ms de LCP.** En todas las mediciones
  **FCP == LCP**, o sea que la página no pintaba nada hasta tener el CSS, y
  `assets/fonts/fonts.css` —2 KB— era una petición externa render-blocking: con 400 ms de RTT,
  esos 2 KB costaban un viaje completo. Inlinadas sus reglas `@font-face` en `index.html`, que
  es además lo que ADR-0003 prescribe. LCP baja de 2 404/2 673/2 491 a **1 932/1 898/1 765 ms** y
  la puntuación de rendimiento de 94 a 98. Sin esto no había gate posible: con la mediana en
  ~2 510 contra un presupuesto de 2 500, cualquier umbral o bloqueaba merges legítimos o no medía
  nada. Coste declarado: `404.html` sigue enlazando el archivo, así que las reglas viven en dos
  sitios sin build que las sincronice — convertido en error detectable con la unitaria **U2.5**—,
  y esos 2 KB pasan de `immutable` a viajar con cada HTML.
- **`@lhci/cli` habría puesto el gate SCA en rojo.** El envoltorio de Lighthouse para CI arrastra
  **323 paquetes** y **7 vulnerabilidades `high`** (`chrome-launcher → rimraf → glob → minimatch
  → brace-expansion`, más `tmp`) que `npm overrides` no alcanza, porque lhci las fija: npm solo
  ofrece bajar a `@lhci/cli@0.6.1`. Se usa **`lighthouse` a secas**: 115 paquetes y **cero
  vulnerabilidades**. Relajar el gate para acomodar la herramienta habría sido peor que el
  problema que resuelve.
- **El gate de axe miraba por una rendija doble.** Filtraba por etiquetas WCAG y solo fallaba
  ante `serious`/`critical`, y esas dos restricciones juntas escondían las 70 incidencias de
  arriba. Ahora incluye las reglas de buenas prácticas y falla también ante `moderate`; solo se
  informan los `minor`, porque un gate que salta por un aviso menor acaba ignorado.
- **El medidor de cobertura dejó de registrar nada en Windows.** El archivo pasó a tener saltos
  CRLF tras una edición, y el parser de HTML los normaliza a LF antes de compilar el script: el
  fuente medido resultaba **108 caracteres más largo** —uno por línea— que el que V8 registró,
  ningún rango casaba y el informe salía vacío con «no se registró cobertura». Normalizado a LF
  dentro del medidor. `.gitattributes` ya guardaba LF en el repositorio, así que el CI nunca se
  vio afectado; el fallo era solo local, que es donde peor se diagnostica.
- **El atributo `hidden` no ocultaba nada, y las E2E lo encontraron en su primera ejecución.**
  La hoja de estilos no tenía ninguna regla `[hidden]`, y el `display` que el navegador aplica a
  ese atributo lo pisa cualquier regla de autor que fije `display`: `.btn-secondary` usa
  `inline-flex`. Medido en Chromium: con `el.hidden = true`, `getComputedStyle(el).display`
  seguía siendo `flex` y el elemento medía más de 0 px. Consecuencia: **durante todo el tiempo en
  que `CONTACT.whatsapp` estuvo vacío, el botón «Hablar por WhatsApp» se publicaba** con
  `href="#contacto"`, un enlace que salta a la sección donde ya está — el «CTA muerto» que el
  comentario del código dice querer evitar. Lo que lo hacía invisible: la verificación registrada
  era `wa-cta.hidden === true`, una propiedad del DOM que jsdom confirma sin resolver la cascada,
  así que la unitaria U8.1 pasaba y seguirá pasando: es correcta y es insuficiente. Arreglado con
  `[hidden] { display: none !important; }` y vigilado desde dos sitios, E6.4 con cascada real y
  U2.4 sobre la hoja. Registrado como corrección de **T3** en el threat model.
- **El número llegó como `+13235543854` y la prueba U8.3 lo rechazó.** `wa.me` exige formato
  internacional **solo con dígitos**: `https://wa.me/+1323…` no es la forma documentada, o sea
  exactamente el «enlace muerto» que el comentario del código dice querer evitar. Es el primer
  encuentro de ese test con un número real y su primera captura; se diseñó para esto.
- **Los tests de U8 dejaban de probar la rama vacía justo al configurarse el número.** U8.1
  comprobaba «sin número el botón no se publica» solo *si el fuente estaba vacío*, y U8.2
  sustituía el literal `whatsapp: ''`, que dejó de existir. Un test condicionado al estado del
  fuente deja de probar cuando ese estado cambia, que es cuando más falta hace. Reescritos para
  sustituir el valor **en ambos sentidos** con una expresión regular que casa el literal sea cual
  sea su contenido, más un U8.4 nuevo que verifica el estado real del repositorio. 49 pruebas.
- **La cobertura de líneas sube de 94,7 % a 100 %** (76/76) como efecto secundario: las cuatro
  líneas del enlace de WhatsApp ya no dependían de un fixture con el fuente mutado —que el
  medidor descarta— porque ahora se ejercitan sobre el fuente real.

### Seguridad
- **Acciones de terceros ancladas por SHA.** `gitleaks-action` y `semgrep-action` estaban
  fijadas por tag, y un tag lo puede repuntar su dueño en cualquier momento: estas acciones
  ejecutan código en el CI, así que quien controle el tag ejecuta lo que quiera. Es el mismo
  razonamiento que se aplicó a `trivy-action` cuando estaba en `@master`. La política —oficiales
  por tag de major, terceros por SHA— queda escrita en la cabecera del workflow, y con ella se
  cierra la desviación que `unit-tests.md` registraba como pendiente.
- **`Cross-Origin-Embedder-Policy: require-corp`**, detectado como ausente por el escaneo DAST
  (ZAP 90004). El sitio ya emitía COOP y CORP; faltaba el tercero de la tríada. Es seguro aquí
  **precisamente** porque no se carga nada de otro origen (ADR-0004): esa directiva rompería
  cualquier recurso cross-origin sin CORP, y no hay ninguno. Verificado con las E2E de CSP y
  fuentes.
- **HSTS activo**, emitido por Cloudflare como correspondía, y a **12 meses**:
  `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. Verificado el
  2026-07-31 con `curl -sI` en `www`, `web` y `demo`, y en varias rutas incluida una que devuelve
  404. Se activó primero con `max-age` de 30 días, que contradecía al propio token `preload` —la
  lista de precarga exige un año—, y se corrigió el mismo día. Cierra el ítem 5 de «Lo que falta»
  del gate 4 y la acción pendiente del A04. Sigue siendo correcto no emitirla desde nginx:
  hacerlo detrás de un terminador TLS que no se controla puede dejar el dominio inaccesible si la
  cadena se rompe.
- **`main` protegido y el pipeline por fin obligatorio.** Al hacerse público el repositorio
  desapareció la limitación del plan Free y se configuró la protección de rama: **pull request
  obligatoria, los siete checks en verde y actualizados respecto a `main`, sin force-push, sin
  borrado y con los administradores incluidos**. Cero aprobaciones requeridas, para no bloquear a
  un mantenedor único. Cierra el riesgo **Alto** que `SECURITY.md` arrastraba desde el principio
  —«los gates de seguridad no bloquean el merge»— y convierte el nodo `Merge bloqueado` del
  diagrama del pipeline, que llevaba meses describiendo una intención, en lo que ocurre de
  verdad. `.githooks/pre-push` se conserva como barrera local redundante.
- **Activadas las tres protecciones que un repositorio público trae gratis**, todas desactivadas
  hasta ahora: *secret scanning*, ***push protection* de secretos** —la más valiosa, porque
  rechaza el push que contiene un secreto en vez de avisar cuando ya está publicado— y
  **Dependabot**, que desde la entrada de `jsdom` tiene 46 paquetes que vigilar.
- Badges de CI y versión pasan a **dinámicos**. La nota del README anticipaba este momento y
  dejaba escritos los reemplazos; comprobado que ambos endpoints responden 200 —«AI-DLC Security
  Gates - passing» y «versión: v0.4.0»— cuando mientras el repositorio fue privado devolvían 404.
  El de pruebas sigue estático: no existe endpoint que cuente pruebas.

### Pendiente de decisión humana
- **El `preload` de HSTS sigue sin efecto, ahora por un solo motivo.** El `max-age` ya cumple;
  falta que el **dominio base** sirva la cabecera, y el apex no resuelve. Cuando se enrute,
  solicitar la precarga sigue siendo una decisión aparte de tener la cabecera bien puesta:
  **entrar en la lista es prácticamente irreversible** —salir tarda meses en llegar a los
  navegadores— y con `includeSubDomains` alcanzaría a `media.`, `encuesta.`, `bots.` y a
  cualquier subdominio futuro.
- Enrutar el apex `higerotech.com` (registro DNS + regla de ingress) **o** mover el canonical y
  las URLs absolutas a `www.higerotech.com`. Lo primero mantiene la marca; lo segundo se
  resuelve solo en el repositorio. Cualquiera de las dos, pero no dejarlo como está.
- Arreglar `gitgraph_from_log.py` (vive en el skill de AI-DLC) y regenerar después
  `docs/03-implementation/repo-history.md`, cuyo grafo se quedó en `a0b767b`. Se intentó
  regenerarlo y la salida no es publicable: el `gitGraph` incluye solo la rama de la primera PR
  y omite las tres siguientes, la bitácora duplica commits no mergeados porque recorre refs
  remotas además de `main`, y los autores de los merges salen con mojibake. Publicar eso sería
  cambiar un documento desactualizado por uno incorrecto.

## [0.4.0] - 2026-07-30

**Cierre del Gate 2 — Implementación**, y la versión en la que el repositorio dejó de creerse a
sí mismo: al medir el sitio publicado resultó que **producción no servía ninguna de las
correcciones de este repositorio** desde hacía dos semanas. Se diagnosticó, se hizo el cutover y
se añadió la comprobación que faltaba para que no vuelva a pasar inadvertido.

De cero pruebas automatizadas a **48 unitarias con cobertura medida** (100 % de funciones del
script inline). Por el camino aparecieron dos casos del mismo patrón —una señal en verde que no
medía nada— que conviene recordar juntos: el healthcheck que **nunca** había dado verde y llevaba
dos semanas en rojo sin lector, y la cobertura incorporada de Node que informaba 100 % midiendo
solo el arnés.

> ⚠️ **Requiere acción al desplegar.** `docker-compose.yml` publica ahora en el **puerto 80** del
> host y no en 8080, porque el ingress del túnel de Cloudflare apunta ahí. Un `docker compose up`
> con la configuración anterior deja el sitio público sin servir. Ver `README.md` §Despliegue.

### Añadido
- **Gate 2 — Implementación: cerrado el 2026-07-30** por decisión del owner, con los cinco
  ítems cumplidos y evidencia ejecutable de cada uno. Se deja escrito el recorrido en vez de
  sustituirlo por un ✅: estuvo abierto por **tres motivos distintos y consecutivos** —faltaba
  pipeline, luego faltaban pruebas, luego faltaba medirlas— y cada uno fue un trabajo aparte.
  Al cerrarlo hubo que revisar el ítem de **SCA**, que estaba marcado ✅ *por ausencia de
  dependencias*: esa justificación caducó al introducir `jsdom`, así que se sustituyó por
  escaneo real. Cerrar el gate sin mirarla habría dejado un ✅ apoyado en un hecho falso.
  Actualizados en consecuencia `README.md` y la sección de estado de
  `docs/03-implementation/repo-history.md`, que todavía afirmaba que el CI no estaba conectado.
  El cierre va acompañado de tres salvedades escritas en el propio gate: los gates **pasan pero
  no bloquean** —sin branch protection un rojo no impide mergear—, la cobertura es del `<script>`
  inline y no dice nada del marcado ni del navegador, y **cerrar Gate 2 no adelanta a Gate 3**.
- **Medición de cobertura del script inline, y el descubrimiento de que la herramienta obvia
  falla en verde.** `node --test --experimental-test-coverage` informaba **100 % de líneas
  midiendo únicamente el arnés**: su reporter solo incluye rutas de archivo, y el JS del sitio
  vive en un `<script>` que jsdom compila bajo la URL del documento. Ni una línea de
  `index.html` entraba en el cálculo. Cerrar el Gate 2 con esa cifra habría dejado documentado
  un 100 % de cobertura sobre el conjunto vacío — el peor modo de fallar que tiene una métrica,
  porque no da error sino un número excelente. Los datos crudos de V8 **sí** registran el script
  inline, así que `tests/cobertura.mjs` los recoge y los traduce a líneas de `index.html`
  (`npm run coverage`). Resultado real: **100 % de funciones (17/17)** y 94,7 % de líneas
  (72/76), esta última una cota inferior porque las pruebas que mutan el fuente quedan fuera del
  recuento. El umbral gatea sobre funciones y se fija en 100, no en el 80 % que pedía el gate:
  estando en 100, bajarlo sería reservar sitio para dejar de probar.
- **Dos huecos reales que encontró esa medición**, con 46 pruebas ya en verde: nadie **pulsaba**
  los botones de idioma —todos los tests llamaban a `setLang()` directamente, así que un botón
  desconectado habría pasado el suite entero— y nadie ejercitaba el respaldo `addListener` para
  navegadores sin la API moderna de media queries. Cerrados con U5.6 y U7.7; el suite pasa de 46
  a **48 pruebas**.
- **46 pruebas unitarias en verde** (`npm test`, ~4 s), implementando el diseño de
  `docs/04-testing/unit-tests.md`. Cargan el `index.html` **real** en jsdom y ejecutan su script
  inline, así que no pueden desviarse del artefacto que se despliega. Cubren los ocho grupos de
  lógica con ramas: paridad de los 130 pares bilingües —el riesgo **R2**, que era la única
  prueba que el repositorio ya reconocía que le faltaba—, contrato JS↔DOM, resolución del
  idioma, efectos de `setLang`, menú móvil con sus cuatro combinaciones de etiqueta accesible,
  RF05, ambas ramas del scroll reveal y el sello del año. Job «Pruebas unitarias» en el CI.
- **El gate SCA deja de ser «N/A por ausencia» y pasa a escanear de verdad.** jsdom trae 46
  paquetes de desarrollo, así que se añade el job `deps` con `npm audit --audit-level=high`
  (hoy: 0 vulnerabilidades). Matiz para leer un rojo futuro: ninguna dependencia viaja en la
  imagen —verificado, la imagen solo contiene los archivos del sitio—, así que un hallazgo sería
  riesgo de la cadena de herramientas del CI, no del sitio publicado.
- **T17 pasa de razonamiento a caso ejecutable.** La prueba U1.5 rompe `id="nav-toggle"` a
  propósito y confirma lo que el threat model deducía leyendo el orden de ejecución: la
  excepción impide que los 15 elementos `.reveal` reciban `.in`, y con `opacity: 0` eso es la
  página en blanco. De paso verifica el propio detector del arnés: un suite en verde cuyo
  mecanismo de detección no funciona es peor que no tener suite.
- `docs/04-testing/unit-tests.md`: **diseño** de las pruebas unitarias, primer documento de la
  fase 04. Arnés `node:test` + `jsdom` cargando el `index.html` real —no una copia, así el test
  no puede desviarse del artefacto que se despliega—, catálogo de ~30 casos sobre las ocho
  unidades con ramas de `index.html:884-992`, trazabilidad a RF05, R2, A05 y los tres bugs de
  `7c7bc78`, y las consecuencias de segundo orden con su coste. Sigue siendo diseño: no hay
  código de test todavía y el Gate 3 no se mueve.
- Corregida en `gate-3-testing.md` la fila «Unit — No aplica: no hay lógica de dominio», que era
  falsa. No hay lógica *de negocio*, que es distinto: hay cinco funciones con ramas, dos
  decisiones con tabla de prioridad y tres degradaciones defensivas sin ninguna prueba.
- Registrada la amenaza **T17** y el riesgo **R4**: una excepción temprana en el script inline
  deja **la página en blanco**. `.reveal` está en `opacity: 0` esperando que el JS le añada
  `.in`, y cinco líneas desreferencian nodos del DOM sin guarda, así que una errata en un `id`
  blanquea el sitio. Quien tenga `prefers-reduced-motion` no lo ve, así que llegaría como un
  reporte contradictorio. Detectado al diseñar las unitarias, no por un incidente.
- **Corregido el estado de T7 en el threat model.** Estaba `✅ Cerrado` con las tres capas de
  ADR-0005, y bajo su lectura literal —«el JS **no se ejecuta**»— el ✅ es correcto. Lo que
  ninguna de las tres capas cubre es la variante «el JS **se ejecuta y lanza** a mitad», de
  idéntico impacto: el `<noscript>` solo actúa con el JS deshabilitado, `prefers-reduced-motion`
  solo alcanza a quien tenga esa preferencia, y **la rama de respaldo sin `IntersectionObserver`
  vive dentro del propio script**, en la línea 978, así que una excepción anterior la deja
  inalcanzable. Es una salvaguarda que comparte destino con el fallo del que protege, y eso no se
  ve leyendo la lista de capas: hay que mirar el orden de ejecución. T7 se queda cerrado con su
  alcance explicitado y la variante pasa a ser T17 (DREAD 5,8), abierta. Anotado en ADR-0005 sin
  modificar la decisión: su análisis **ya nombraba** «error de ejecución» como caso no cubierto
  por `<noscript>` en solitario, y su 4.ª alternativa descartada —`in` por defecto, que el JS
  retire— es robusta por construcción contra T17; se descartó solo por el parpadeo. Lo único
  demasiado fuerte era su conclusión de que un fallo de script dejaba de denegar el contenido.
- Hueco equivalente anotado en el **A10** del mapeo OWASP: su lista cubre condiciones
  excepcionales *externas* al script y no la del script mismo.
- Anotado que **`?lang=EN` sirve español en silencio**: `IDIOMAS.indexOf(q)` distingue
  mayúsculas, así que un enlace compartido en mayúsculas pierde el idioma sin síntoma. Pendiente
  de decisión: aceptarlo y documentarlo, o normalizar con `.toLowerCase()`.
- Badges de gates de seguridad, pruebas y versión en `README.md`. Son **estáticos** por
  necesidad: con el repositorio privado, el proxy de imágenes de GitHub pide los badges sin
  autenticar y todo endpoint dinámico responde 404 o «repo not found» (comprobado contra el
  badge propio de GitHub y dos de shields.io). Las URLs dinámicas equivalentes quedan
  comentadas en el propio README para cuando el repositorio deje de ser privado. El badge de
  pruebas dice **«sin suite»**, que es la verdad: no hay ninguna prueba automatizada.
- `.githooks/pre-push` rechaza los pushes directos a `main`, con su activación por
  `core.hooksPath` documentada en `CONTRIBUTING.md`. Es un sustituto local y parcial: no
  exige los security gates ni alcanza los merges desde la web.

### Cambiado
- **El repositorio deja de tener cero dependencias.** `jsdom` como única `devDependency`
  directa, 46 paquetes con las transitivas. Era el intercambio aprobado: se gasta esa propiedad
  a cambio de cobertura real de la lógica del sitio. `node_modules/` **no estaba en
  `.gitignore`** —se habría commiteado— y ahora sí; `package-lock.json` sí se versiona, porque
  hace reproducible el CI y es lo que escanea el gate de dependencias. `.dockerignore` excluye
  `node_modules/`, `tests/` y los `package*.json`: el `Dockerfile` copia archivos concretos y
  nunca habrían llegado a la imagen, pero sin excluirlos viajarían al daemon en cada
  `docker build`. Verificado que la imagen resultante solo contiene los archivos del sitio.
- El badge de pruebas del README pasa de «sin suite» a «46 unitarias sin E2E». Se queda en
  **ámbar y no en verde** a propósito: la pirámide sigue incompleta y el Gate 3 abierto.
- Tres desviaciones respecto al diseño aprobado, todas registradas en el propio documento con su
  motivo: el job de CI corre **en paralelo** con los de contenedor en vez de antes (los cinco
  duran menos de un minuto; encadenarlos solo añadiría latencia), `actions/setup-node` se ancla
  por tag `@v4` y no por SHA (el repositorio ancla por SHA lo de terceros y por tag las acciones
  oficiales; migrar todo a SHA queda como decisión aparte y **pendiente**), y se añadió el job
  de SCA que el diseño solo mencionaba como consecuencia.
- `docker-compose.yml` publica en el **puerto 80** del host, antes 8080. No es una preferencia:
  el ingress del túnel de Cloudflare apunta a `http://<IP del host>:80`, así que cualquier otro
  puerto deja el sitio público sin servir aunque el contenedor esté sano. Queda escrito al lado
  de la directiva para que no se «limpie» en el futuro. Que el origen sea la IP del host y no la
  del contenedor es lo que permitió recrearlo con compose sin tocar el enrutado.
- **El borde deja de ser un `<TODO>`.** Confirmado con `docker inspect landing-tunnel` y sus
  logs de configuración: es cloudflared en modo token, el *ingress* vive en el panel de
  Cloudflare —no en el repositorio ni en el host—, enruta `www`, `web` y `demo` a
  `http://192.168.1.44:80` con regla final `http_status:404`, y **TLS lo termina Cloudflare**.
  Con eso se cierran tres huecos que arrastraban `<TODO>`: la dependencia D4 de los requisitos,
  la amenaza T9 del threat model y el A04 del mapeo OWASP. HSTS sigue pendiente y solo puede
  activarse en el borde, nunca desde nginx.

### Seguridad
- **Producción redesplegada, y hasta hoy no servía ninguna de las correcciones de este
  repositorio.** El contenedor que publicaba el sitio se creó el 2026-07-14 con `docker run` y
  medido con `curl -sI` no enviaba **ninguna** de las cinco cabeceras de seguridad, exponía
  `Server: nginx/1.27.5` (el gate G7 comprueba precisamente que la versión no se filtre) y
  corría la imagen base con los 36 CVEs corregibles —2 CRITICAL, 34 HIGH— que se cerraron esta
  misma semana. Tampoco tenía el endurecimiento del compose: `ReadonlyRootfs: false`,
  `CapDrop: []`. Los gates G5 y G7 pasaban en verde en cada PR **contra la imagen**, mientras
  el sitio real los fallaba los dos: avalar un artefacto no es avalar lo publicado, y el
  pipeline no distinguía las dos cosas. Tras el cutover con `docker compose up -d --build`,
  verificado: `healthy` por primera vez en la vida del servicio, `read_only=true` y
  `cap_drop=[ALL]` activos en el contenedor que corre, las cinco cabeceras y `404` real en
  local, y las cuatro que Cloudflare propaga más `404` real en `www`, `web` y `demo`.
- El contenedor anterior **no se borró**: al intentar etiquetarlo como punto de rollback su
  imagen ya no existía en el almacén (`docker image inspect` → *No such image*, y
  `docker commit` → *content digest not found*). Llevaba semanas sirviendo desde un montaje
  vivo cuyas capas habían desaparecido: irreconvertible en imagen y única copia de lo
  publicado. Se apartó con `--restart=no`, renombrado a `higerotech-landing-pre-cutover` y
  detenido, y su contenido se extrajo con `docker cp`. Borrar ese contenedor destruye la última
  copia. Refuerza el `<TODO>` del runbook de rollback: no basta con etiquetar por versión, hay
  que empujar las imágenes a un registro, porque una etiqueta local no sobrevive a un
  `docker system prune`.
- `aquasecurity/trivy-action` anclado por SHA de commit (`ed142fd`, v0.36.0) en sus dos usos,
  antes en `@master`. El job que avala las imágenes que se despliegan ejecutaba lo último de
  una rama móvil, por delante incluso de la última release publicada: quien controlase esa
  rama ejecutaba código en el CI. Se ancla por SHA y no por tag porque un tag también lo
  puede repuntar el dueño del repositorio.
- Imagen base actualizada de `nginx:1.27-alpine` (Alpine 3.21.3) a `nginx:1.30-alpine`
  (Alpine 3.24.1). Cierra los 36 CVEs corregibles —34 HIGH y 2 CRITICAL— que el escaneo de
  contenedor reportaba en `openssl`, `libxml2`, `musl` (`CVE-2026-40200`, ejecución arbitraria
  de código), `nghttp2` y `zlib`. Trivy pasa de 36 a 0 con los mismos flags del gate. El pin
  se queda en la línea `1.30` (stable) y no en `stable-alpine`, para recibir los parches
  `1.30.x` sin saltar de línea sola.

### Corregido
- **El healthcheck nunca ha dado verde.** `Dockerfile` y `docker-compose.yml` apuntaban a
  `http://localhost/`: el `/etc/hosts` de la imagen resuelve ese nombre también a `::1`, el
  `wget` de busybox intenta IPv6 antes que IPv4 y `nginx.conf` solo declara `listen 80`. Todos
  los chequeos devolvían `connection refused` —611 seguidos en el contenedor de producción—
  mientras el sitio respondía 200 con normalidad. Es decir: **cualquier** despliegue de esta
  imagen nacía `unhealthy`, y el `unhealthy` que se registró como hallazgo operativo el
  2026-07-29 no era una avería del host sino un defecto de este repositorio. Corregido a
  `127.0.0.1` en los dos sitios y verificado `healthy` en un contenedor construido con el
  arreglo. No se añade `listen [::]:80;` a `nginx.conf`: en un contenedor sin IPv6 esa
  directiva impide que nginx arranque, y cambiar un chequeo mal apuntado por un servicio que
  no levanta es un mal negocio.
- Corregida en consecuencia la afirmación de `gate-5-monitoring.md` y del A09 de
  `owasp-mapping.md` de que «el healthcheck existe y funciona, pero nadie está escuchando».
  Funcionaba no: la única señal automatizada del sistema llevaba en rojo permanente desde que
  el contenedor se creó, el 2026-07-14, y era además un falso positivo. Un monitor externo
  conectado entonces habría alertado de algo que no estaba pasando.
- `deployment.md`: el túnel del borde era un `<TODO>`; es **cloudflared en modo token**, y su
  *ingress* se administra en el panel de Cloudflare, no en el repositorio ni en el host. Queda
  anotado porque condiciona el redespliegue: recrear la landing con `docker compose` la mueve
  de red y de puerto, y si el origen del túnel está fijado a la IP del contenedor en la
  `bridge` por defecto, el sitio público cae con el contenedor sano.
- Registrada en `gate-4-deployment.md` la **deriva entre el compose y producción**: el
  contenedor que corre se creó el 2026-07-14 con `docker run` (sin etiquetas de compose,
  puerto 80 en vez de 8080, `ReadonlyRootfs: false`, `CapDrop: []`). El endurecimiento que la
  tabla de evidencias da por bueno está en el archivo y no en lo que sirve el sitio hoy.
- **Revisión de coherencia de la documentación.** Casi toda se escribió el 2026-07-29, antes de
  que el repositorio existiera en GitHub, y describía un mundo sin CI. Sincronizado con la
  realidad:
  - `gate-2`: el SAST constaba como «no ejecutado, no hay pipeline conectado» y los tres
    bloqueos declarados (Semgrep, Trivy, gitleaks) están hechos. El gate sigue abierto, pero
    **por otro motivo**: falta cobertura, que depende de que exista suite. El `Estado` de la
    cabecera no se toca: cerrarlo es decisión del owner.
  - `gate-4`: «SBOM generado — pendiente» era falso (se genera en cada run), y el ítem de los
    siete gates canónicos ahora detalla que van 5 de 7, con `license` y DAST ausentes.
  - `deployment.md`: decía que Semgrep y Trivy «dependen de que se conecte el repositorio a
    GitHub Actions», ya conectado. Y su diagrama promete `Merge bloqueado`, que **no ocurre**:
    ahora está marcado como intención y no como hecho.
  - `SECURITY.md`: «no contiene ni necesita secretos» dejó de ser cierto al añadir
    `GITLEAKS_LICENSE` como secreto de Actions. Distinguido código de CI, y registrada como
    brecha **alta** que los gates no bloqueen el merge.
  - `README.md`: «falta CI conectado» y «conectar el pipeline» eran obsoletos; «los 7 gates»
    era ambiguo porque hay **dos listas distintas de siete** —las G1–G7 del pipeline, todas en
    verde, y las siete canónicas de AI-DLC, con dos ausentes—. Desambiguado.
  - `repo-history.md`: su grafo describe un repo sin ramas ni merges, que ya no es este.
    Marcado como pendiente de regenerar cuando aterrice la pila de PR.
  - `CONTRIBUTING.md`: escribía `scripts/gitgraph_from_log.py` como si el script estuviera en
    el repositorio; vive en el skill de AI-DLC, como `validate_mermaid.py`.
- El gate de secretos no escaneaba nada, por dos causas encadenadas: `gitleaks-action` exige
  licencia en repos de organización y abortaba con «missing gitleaks license», y una vez
  resuelta moría con «Resource not accessible by integration» porque el bloque global
  `permissions: contents: read` no cubre la API de PRs que el action necesita. El workflow ya
  le pasa `GITLEAKS_LICENSE` y le concede `pull-requests: write` **por job**, dejando los
  otros cuatro sin ese acceso. Gate 2 daba por cubierto un control inexistente desde que se
  documentó; el primer escaneo real no encontró filtraciones.
- Registrado el alcance verdadero del gate: escanea el rango de commits del evento
  (`--log-opts=--no-merges --first-parent`), no el historial. La revisión del pasado se hizo
  aparte con el binario de gitleaks sobre los 9 commits del repo, sin hallazgos.
- Los enlaces de comparación del changelog y `org.opencontainers.image.source` apuntaban a
  `higerotech/website`; el repositorio se publicó como `higerotech/landing`.

### Decidido
- **Dominio confirmado: `higerotech.com`.** El owner lo cerró el 2026-07-30. Coincide con lo
  que ya estaba escrito en `canonical`, `hreflang`, Open Graph, JSON-LD, `robots.txt` y
  `sitemap.xml`, así que no hay contenido que cambiar; deja de figurar como supuesto en
  `charter.md`.
- **Pero confirmarlo no bastó: el apex no resuelve.** `higerotech.com` no tiene registro en DNS
  —la consulta devuelve solo SOA, con la zona en los NS de Cloudflare— ni regla en el ingress
  del túnel; forzando la IP de Cloudflare responde **HTTP 530**, y ninguno de los otros cuatro
  túneles del host lo sirve. El sitio vive en `www.higerotech.com`, `web.higerotech.com` y
  `demo.higerotech.com`. Consecuencia: `canonical`, los tres `hreflang`, `og:url`, las URLs del
  `sitemap.xml` y la línea `Sitemap:` de `robots.txt` apuntan a un host inexistente, y los tres
  hostnames son contenido duplicado sin un canonical válido que los consolide. Registrado como
  dependencia D1b en los requisitos y como fila 9 de «Lo que falta» en el gate 4.

## [0.3.0] - 2026-07-29

Fases 03 y 05 documentadas. Gate 2 y Gate 4 quedan **abiertos** con su razón registrada.

### Añadido
- `docs/03-implementation/repo-history.md`: `gitGraph` y bitácora derivados del historial
  real con `gitgraph_from_log.py`, más la trazabilidad tag ↔ versión ↔ ADR.
- `docs/05-deployment/deployment.md`: `C4Deployment` de la topología, `flowchart` del
  pipeline con su ruta de rollback, `gantt` de cutover, tabla de verificación ejecutada
  contra la imagen construida y runbook de rollback con disparadores.
- `CHANGELOG.md` y `README.md` reescrito como índice de la documentación AI-DLC.

### Corregido
- Documentado que el rollback descrito **no es ejecutable hoy**: `docker-compose.yml` fija
  `image: …:latest` y no se conservan imágenes etiquetadas por versión.

## [0.2.0] - 2026-07-29

Cierre de **Gate 1 — Diseño**.

### Añadido
- `docs/02-design/architecture.md` con las cinco vistas: `C4Container`, `C4Component`,
  `sequenceDiagram` de la primera visita, `stateDiagram-v2` del nodo i18n y
  `erDiagram` + `classDiagram` del modelo de contenido.
- `docs/02-design/threat-model.md`: DFD con cinco fronteras de confianza, STRIDE por
  componente y 16 amenazas priorizadas por DREAD.
- ADR-0002 — cabeceras de seguridad como snippet incluido en cada `location`.
- ADR-0003 — archivo único sin build, con `'unsafe-inline'` como deuda registrada.
- ADR-0004 — autoalojar las fuentes y eliminar toda dependencia de CDN.
- ADR-0005 — la página debe ser legible sin JavaScript.
- Contrato HTTP de rutas, códigos y cabeceras (el sistema no expone API).

### Seguridad
- T4 (`'unsafe-inline'` en la CSP) y T9 (HTTP plano host interno) registrados como
  **riesgos aceptados** con disparador de revisión explícito, no como controles cumplidos.

## [0.1.0] - 2026-07-29

Cierre de **Gate 0 — Requisitos**. Adopción de AI-DLC en variante polyrepo.

### Añadido
- `docs/00-project/charter.md` con `mindmap` de alcance, restricciones, métricas y riesgos.
- `docs/00-project/glossary.md`: lenguaje ubicuo, incluidos los términos del dominio
  venezolano que aparecen en el copy (IGTF, SUDEBAN 001-21, NIC 29/NIIF 13, CRDT).
- `docs/00-project/data-classification.md`: el sistema no trata datos personales; se
  documenta por qué y qué cambiaría al añadir un formulario.
- `docs/01-requirements/landing-corporativa.md`: PRD con `C4Context`, `journey`,
  `requirementDiagram`, DFD, `quadrantChart` DREAD, escenarios de abuso EA01–EA06 y
  requisitos de seguridad RS01–RS07 mapeados a ASVS nivel L1.
- ADR-0001 — adopción de la estructura AI-DLC en variante polyrepo.
- `.ai-dlc/` con los seis checklists de gate, plantillas y mapeo OWASP Top 10:2025 adaptado
  al alcance real, marcando qué **no aplica** y por qué.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`.
- Pipeline `.github/workflows/security-gates.yml` con siete gates, incluyendo verificación
  de cabeceras en cuatro rutas distintas y comprobación de códigos 404 reales.

## [0.0.2] - 2026-07-29

Correcciones de la revisión previa a la adopción de AI-DLC. Sin cambios de contenido
editorial: el copy y el diseño son los mismos.

### Corregido
- **CTA de WhatsApp muerto.** Apuntaba a `https://wa.me/` sin número. Ahora el `href` se
  compone desde `CONTACT.whatsapp` y el botón queda oculto mientras no esté configurado.
- **El 80 % de la página era invisible sin JavaScript.** Los 15 elementos `.reveal` tenían
  `opacity: 0` y dependían por completo de `IntersectionObserver`. Añadidos `<noscript>`,
  rama de respaldo y regla de `prefers-reduced-motion`.
- **Menú inalcanzable en móvil.** `.nav-links` se ocultaba bajo 980 px sin reemplazo.
  Añadida hamburguesa con `aria-expanded`, cierre con Escape y al pulsar un enlace.
- **Contraste insuficiente.** `--text-dim` daba 3,94:1 sobre `--ink`, por debajo del 4,5:1
  que exige WCAG AA para texto pequeño. Ahora 6,49:1 sobre `--ink` y 4,78:1 sobre
  `--dark-3`, el peor fondo donde se usa.
- **Soft 404.** `try_files … /index.html` devolvía 200 con la landing para cualquier ruta.
  Ahora responde 404 real con página propia.
- `Cache-Control` duplicado en los assets (`expires` y `add_header` emitían ambos).
- Saltos de nivel de encabezado (h2 → h4) en las secciones de arquitectura y valores.
- `assets/icon_calendar.png` pesaba 0 bytes; eliminado.
- Año del pie hardcodeado; ahora se calcula.

### Añadido
- Fuentes **autoalojadas** (Inter y Space Grotesk, SIL OFL 1.1). Se declaran como fuentes
  variables con rango `400 700`: un archivo por familia y subset en vez de cuatro copias
  idénticas. Con `unicode-range`, un visitante ES/EN descarga solo `latin` (~70 KB).
- Open Graph, Twitter Card, `canonical`, `hreflang`, JSON-LD de `ProfessionalService` y
  tarjeta social 1200×630.
- `robots.txt`, `sitemap.xml` y página `404.html` con la identidad del sitio.
- Idioma persistente e indexable: `?lang=en` → `localStorage` → `es`.
- Foco visible para navegación por teclado, `aria-hidden` en los 34 SVG decorativos,
  `aria-pressed` en el selector de idioma y `aria-label` en el botón de menú.

### Seguridad
- **Las cabeceras de seguridad no llegaban a la home ni a los assets.** En nginx,
  `add_header` solo se hereda del nivel superior si el nivel actual no declara ninguna
  propia; como varios `location` añadían su `Cache-Control`, descartaban las cuatro
  cabeceras del bloque `server`. Extraídas a `security-headers.conf` e incluidas
  explícitamente en cada `location`.
- Añadidos `Content-Security-Policy`, `Cross-Origin-Opener-Policy`,
  `Cross-Origin-Resource-Policy` y `server_tokens off`.
- `X-Frame-Options` pasa de `SAMEORIGIN` a `DENY`.
- Eliminada la dependencia de `fonts.googleapis.com`, que bloqueaba el render y exponía la
  IP de cada visitante a un tercero.
- Contenedor endurecido: `read_only`, `cap_drop: ALL`, `no-new-privileges`, límites de CPU
  y memoria, `nginx -t` en tiempo de build.
- `location ~ /\.` deniega rutas ocultas; `.dockerignore` impide que `.git` o `.env`
  lleguen al contexto de build.

## [0.0.1] - 2026-07-14

### Añadido
- Línea base: landing monolítica (`index.html`), assets, `Dockerfile`, `nginx.conf` y
  `docker-compose.yml`. Registrada intacta en el commit `f09c213` antes de cualquier
  corrección, para que diagnóstico y arreglo sean auditables por separado.

[Unreleased]: https://github.com/higerotech/landing/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/higerotech/landing/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/higerotech/landing/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/higerotech/landing/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/higerotech/landing/releases/tag/v0.1.0
[0.0.2]: https://github.com/higerotech/landing/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/higerotech/landing/releases/tag/v0.0.1
