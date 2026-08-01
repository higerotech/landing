# Plan de despliegue — Cloudflare Workers con static assets

* **Estado:** **completado el 2026-07-31.** El apex y `www` sirven desde el Worker; `demo.` y
  `web.` siguen en el túnel como contingencia. Los tres hallazgos, cerrados
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 05-deployment
* **Versión:** 1.0.0
* **Decisión de referencia:** [ADR-0006](../00-project/adr/0006-servir-desde-cloudflare-workers.md)
* **Estrategia:** migración por hostname, con el túnel como contingencia inmediata

## Topología objetivo

```mermaid
flowchart LR
    V([Visitante]) --> CF{Cloudflare}

    CF -->|higerotech.com| W[Worker<br/>static assets]
    CF -->|www.higerotech.com| W
    CF -->|demo.higerotech.com| T[Tunel cloudflared]
    CF -->|web.higerotech.com| T

    W --> A[(index.html, 404.html<br/>assets, robots, sitemap)]
    T --> H[Host Docker<br/>nginx 1.30-alpine]
    H --> A2[(la misma imagen<br/>que hoy)]

    GH[GitHub Actions<br/>wrangler deploy] -.despliega.-> W

    style W fill:#1168bd,color:#ffffff
    style T fill:#e08000,color:#ffffff
    style H fill:#e08000,color:#ffffff
```

*Eje estructura · Fase 05 · Quien sirve cada hostname tras la migracion.*

Dos caminos a propósito: **azul es producción, ámbar es contingencia y pruebas.** El túnel y el
contenedor no se retiran; dejan de servir los hostnames canónicos.

## Lo que se añade al repositorio

Ya está todo en el repositorio, inerte hasta que se active el interruptor:

| Archivo | Para qué | Estado |
|---|---|---|
| `wrangler.jsonc` | Directorio de assets, `html_handling` y `not_found_handling: "404-page"` | ✅ |
| `cloudflare/_headers` | Las cabeceras de seguridad en el camino del Worker | ✅ |
| `worker/index.mjs` | Abre CORP en tres assets de marca — lo único que `_headers` no puede hacer | ✅ |
| `scripts/preparar-assets.mjs` | Ensambla `dist/` desde una lista de **inclusión** | ✅ |
| `.github/workflows/desplegar-worker.yml` | `wrangler deploy` + verificación de lo publicado | ✅ |
| `tests/unit/u12-cabeceras-worker.test.mjs` | Falla si las dos definiciones de cabeceras divergen | ✅ |

`wrangler` queda anclado en el lockfile —87 paquetes, gate SCA en verde— en vez de invocarse
suelto con `npx wrangler@4`: un despliegue debe ser reproducible, no depender de lo que haya
publicado el registro esa mañana.

### Por qué una lista de inclusión y no `.assetsignore`

wrangler admite exclusiones, y sería más corto apuntar el Worker a la raíz e ir tachando
`node_modules`, `docs`, `tests`… Pero una lista de exclusión **falla hacia el lado peligroso**:
el día que aparezca un archivo nuevo —un volcado, un `.env` de pruebas— se publica solo porque
nadie se acordó de añadirlo. El `Dockerfile` usa inclusión desde el principio y por eso nunca se
ha colado nada en la imagen. **U12.3** comprueba que ambas listas digan lo mismo.

### La URL de verificación se deriva, no se configura

La primera versión del workflow leía la URL a verificar de una variable de repositorio. Es un
error de la misma familia que este repositorio lleva semanas corrigiendo: **la variable puede
decir una cosa mientras el despliegue fue a otra**, y entonces la verificación da verde sobre
algo que no es lo que se acaba de publicar.

Ahora se extrae de la salida de `wrangler deploy`, y si no se puede extraer el job falla en vez
de verificar a ciegas. `workers_dev: true` en `wrangler.jsonc` garantiza que esa URL exista, que
es lo que hace comprobable el paso 1 **antes de tocar ningún DNS**.

También se desactiva la telemetría de wrangler (`WRANGLER_SEND_METRICS=false`): el mismo criterio
que llevó a autoalojar las fuentes para no filtrar la IP de los visitantes (ADR-0004).

### El interruptor

El workflow solo corre si existe la variable de repositorio `DESPLIEGUE_WORKER=activado`.
Deliberado: mientras no exista el token, este workflow pondría en rojo **cada merge a `main`**
sin que nada esté roto de verdad, y un CI que falla por diseño enseña a ignorar los fallos.

### Por qué `not_found_handling: "404-page"`

Verificado en el esquema de wrangler 4.118: admite `404-page`, `single-page-application` y
`none`. Con `404-page` una ruta inexistente devuelve **404 de verdad** con `/404.html`, que es
justo lo que costó un bug y un ADR conseguir en nginx —antes `try_files … /index.html` devolvía
200 con la landing, un *soft 404*—. Elegir `single-page-application` reintroduciría ese defecto.

### Por qué una prueba que compare las cabeceras

Van a existir dos definiciones de lo mismo, sin build que las sincronice. Este repositorio ya
tiene el precedente: al inlinar el `@font-face` para ahorrar un round trip, las reglas quedaron
duplicadas y hubo que escribir **U2.5** para que la deriva fuera un fallo y no una sorpresa.
Aquí aplica igual, y con más motivo: son cabeceras de seguridad.

## Lo que hay que hacer en Cloudflare

Estas tres cosas no están en el repositorio y las tiene que hacer una persona con acceso a la
cuenta:

1. ~~**Token de API** con permiso `Workers Scripts: Edit` sobre la cuenta, y **solo eso**.~~
   ✅ hecho. Es una credencial que puede desplegar: alcance mínimo y rotable.
2. ~~**Dominios propios del Worker** para `higerotech.com` y `www.higerotech.com`.~~ ✅ hecho.
3. ~~**Retirar del ingress del túnel** las entradas de `www` y del apex.~~ ✅ `demo.` y `web.` siguen.
4. ~~**Desactivar la inyección automática de Web Analytics** en la zona.~~ ✅ hecho (Hallazgo 2).

### Por qué los dominios propios se crean a mano y no en `wrangler.jsonc`

`wrangler` sabe crearlos: bastaría un bloque `routes` con `custom_domain: true` y el despliegue
los engancharía solo. Sería más reproducible, y aun así **no se hace**, porque el precio es
ampliar el token del CI con permiso sobre **DNS de la zona**. Un token que solo publica un script
y un token que puede reescribir el DNS del dominio no son la misma credencial ni de lejos, y
ADR-0006 se compromete a alcance mínimo.

La contrapartida es no quedarse sin red: **`scripts/verificar-zona.mjs` afirma lo que debería ser
cierto** aunque no lo cree. No crea el dominio propio, pero no deja que se quede mal en silencio
— que es lo que pasó con `www`.

## Secuencia de cutover

Diseñada para que en ningún paso el sitio quede sin servir, y para poder volver atrás en
minutos.

| # | Paso | Cómo se comprueba |
|---|---|---|
| 1 | ~~Añadir los archivos del Worker y desplegar a un `*.workers.dev`~~ | ✅ **Hecho el 2026-07-31** — ver §Resultado del paso 1 |
| 2 | ~~Enrutar **solo el apex** al Worker~~ | ✅ **Hecho el 2026-07-31** — 200 en vez de 530 |
| 3 | ~~Verificar el apex con el suite completo~~ | ✅ **Hecho** — 54/58, y los 4 fallos destaparon algo real; ver §Resultado de los pasos 2 y 3 |
| 4 | ~~Mover `www` al Worker y quitarlo del ingress~~ | ✅ **Hecho el 2026-07-31** — pasa las seis comprobaciones de `verificar:zona` |
| 5 | ~~Dejar `demo.` en el túnel como estaba~~ | ✅ `demo.` y `web.` siguen sirviendo desde el contenedor |

**El paso 2 es deliberadamente el apex y no `www`.** Hoy el apex no sirve a nadie —responde
530—, así que es el único hostname donde un fallo no tiene consecuencias. Se estrena la
infraestructura nueva donde no hay tráfico que perder.

## Resultado del paso 1 *(2026-07-31)*

Desplegado en `https://higerotech-landing.jeremialcala.workers.dev`, con las **58 E2E en verde
contra el Worker real** (32 s) desde el propio workflow, más comprobación aparte:

| Comprobación | Resultado |
|---|---|
| Las cinco cabeceras de seguridad | ✅ |
| COOP + COEP + CORP | ✅ |
| Ruta inexistente → **404 real** | ✅ |
| `robots.txt`, `sitemap.xml`, fuentes | ✅ 200 |
| Cabeceras **en las propias redirecciones** | ✅ 5 de 5 |

La última se comprobó aparte a propósito: una redirección que saliera sin CSP sería un hueco
pequeño y fácil de no ver. `_headers` con `/*` sí las aplica.

**Todo esto sin tocar un solo registro DNS.** El sitio en producción siguió sirviéndose por el
túnel durante toda la operación.

### Fricción de puesta en marcha, para que no se repita

Tres intentos fallidos antes del bueno, y ninguno de los tres motivos era obvio:

1. **`DESPLIEGUE_WORKER` se creó como *secreto* en vez de *variable*.** `vars.` no puede leer
   secretos, así que el job **se saltó en silencio** — que es el modo de fallo más caro: parece
   que no pasó nada. Están en pestañas contiguas de la misma pantalla. El interruptor no es
   sensible —su valor es `activado`— y le corresponde ser variable.
2. **El token autenticaba pero no autorizaba.** `wrangler whoami` funciona perfectamente con un
   token sin `Workers Scripts: Edit`: resuelve la cuenta y no se queja. Es decir, **que la
   autenticación funcione no dice nada sobre si podrá desplegar**. El fallo aparece al llamar a
   `workers/services`, con `Authentication error [code: 10000]`, que suena a credencial inválida
   y es un permiso ausente.
3. **El log despista.** wrangler sugiere `User → Memberships → Read`, que es para la parte
   cosmética de `whoami` y **no** es la causa. Concederlo amplía el token sin arreglar nada.

Un detalle de diagnóstico que ahorró trabajo: en la tabla de `whoami`, el ID de cuenta que
devolvió la API salía como `***`. GitHub solo enmascara lo que **coincide con un secreto**, así
que ver el ID oculto demuestra que el configurado y el del token son el mismo — descarta la
hipótesis del ID equivocado sin abrir el panel.

## Resultado de los pasos 2 y 3 *(2026-07-31)*

El apex responde **200** donde antes daba 530. Para confirmar que lo sirve el Worker y no el túnel
se usó **el discriminador que salió del paso 1**: la redirección de `/index.html`, que en el Worker
es 307 y en nginx 200. Aquella diferencia se documentó como curiosidad y acabó siendo la
herramienta de diagnóstico.

| Hostname | `/index.html` | `/404.html` | Origen real |
|---|---|---|---|
| `higerotech.com` | 307 → `/` | 307 | **Worker** ✅ |
| `higerotech-landing…workers.dev` | 307 → `/` | 307 | Worker |
| `demo.higerotech.com` | 200 | 404 | nginx, por el túnel ✅ |
| `web.higerotech.com` | 200 | 404 | nginx, por el túnel ✅ |

Las cinco cabeceras, COOP/COEP/CORP y el HSTS con `preload` salen correctos por el apex.

El suite completo contra `https://higerotech.com`: **54 de 58**. Los cuatro fallos son **una sola
causa raíz**, y no es del Worker.

### Hallazgo 1 — `www.higerotech.com` dejó de existir

**NXDOMAIN**, confirmado por dos resolvers independientes (1.1.1.1 y 8.8.8.8: `Status: 3`, sin
`Answer`). No es caché local — el registro no está.

Y estaba hace unas horas. Medido en esta misma máquina:

| Cuándo | Resultado |
|---|---|
| 2026-07-30 02:40 | `www.higerotech.com -> 172.67.165.34, 104.21.11.40` |
| 2026-07-31 02:15 | responde; se le mide HSTS junto a `web.` y `demo.` |
| 2026-07-31 16:53 | **NXDOMAIN** |

Desapareció en la ventana en la que se engancharon los dominios propios del Worker. **El daño es
pequeño, y conviene decir por qué**: `canonical`, los tres `hreflang`, `og:url`, `sitemap.xml` y
`robots.txt` apuntan todos al **apex**, que sí funciona. Lo que se rompe son los enlaces externos
y marcadores que apunten a `www`, y las instrucciones de verificación del `README` y de
`deployment.md`, que mandan mirar precisamente `www`.

**Decisión pendiente**, y el paso 4 ya iba en esa dirección: engancharlo como segundo dominio
propio del Worker. La alternativa —devolverle el CNAME al túnel— solo tiene sentido para
posponer.

### Hallazgo 2 — Cloudflare inyecta un script de terceros, y la CSP lo bloquea

En **todos** los hostnames de la zona, el HTML servido lleva añadido:

```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/..."
        data-cf-beacon="{&quot;version&quot;:&quot;2024.11.0&quot;, ...}">
```

Es la inyección automática de **Cloudflare Web Analytics**, activada a nivel de zona.

Dos cosas que costó ver y merecen quedar escritas:

1. **Solo se inyecta a peticiones de navegador.** Un `curl` normal —`Accept: */*`— devuelve el
   HTML **byte a byte idéntico** al desplegado: 84 034 bytes en el apex, en `workers.dev` y en el
   repositorio. Con `Accept: text/html` son **84 393**. Los 359 bytes de diferencia son el
   `<script>`. Cualquier comprobación hecha con `curl` a secas **no lo ve**.
2. **No lo causó el Worker.** Está también en `demo.` y `web.`, que van por el túnel a nginx, y
   **no** está en `workers.dev`, que no pertenece a la zona. Es decir: llevaba puesto en
   producción, y el paso 3 es simplemente **la primera vez que el suite se ejecuta contra un
   hostname de la zona**.

| Hostname | ¿beacon inyectado? |
|---|---|
| `higerotech.com` | sí |
| `demo.higerotech.com` | sí |
| `web.higerotech.com` | sí |
| `…workers.dev` | **no** |

**La CSP lo bloquea.** `script-src 'self'` → violación `script-src-elem`, y el script no se
ejecuta:

```
Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/...' violates the
following Content Security Policy directive: "script-src 'self' 'unsafe-inline'".
The action has been blocked.
```

O sea que **la analítica nunca funcionó** y, a la vez, **ningún dato de visitante llegó a salir**.
La segunda capa aguantó. Pero deja una violación de CSP y un error de consola en cada carga, que
es justo el ruido que hace que un día se deje de mirar la consola.

Y choca de frente con **ADR-0004**: las fuentes se autoalojan precisamente para no filtrar la IP
de los visitantes a un tercero. Tener un beacon de terceros inyectado por el borde contradice esa
decisión, aunque hoy lo salve la CSP.

**Acción pendiente**: desactivar la inyección automática de Web Analytics en la zona. Meter
`static.cloudflareinsights.com` en la CSP sería la otra salida, y es la equivocada: arreglaría el
síntoma aceptando justo lo que ADR-0004 rechaza.

Los cuatro fallos —E5.1, E5.4, E5.6 y E9.5— son este mismo beacon visto desde cuatro ángulos:
violación de CSP, petición fuera del origen, error en consola y ruido en la prueba de inyección.
No hay que tocar ninguna de las cuatro: están haciendo exactamente su trabajo.

### Lo que esto enseña sobre **dónde** se mide

El suite siempre ha corrido contra `localhost`, contra el contenedor o contra `workers.dev`.
**Nunca contra un hostname de la zona.** Todo lo que el borde añade —inyecciones, reglas de
transformación, Rocket Loader, ofuscación de correo— era invisible para los diez gates, y lo
seguiría siendo.

Es la misma familia que la deriva de dos semanas: los gates avalaban un artefacto correcto
mientras lo que recibía el visitante era otra cosa. **Acción:** que la verificación posterior al
despliegue apunte al hostname de la zona, no solo a `workers.dev`.

### La verificación que faltaba: `npm run verificar:zona`

El Hallazgo 2 no es solo un beacon que quitar; es que **había un sitio entero donde nadie
miraba**. El suite corría contra `localhost`, contra el contenedor y contra `workers.dev`, y el
borde de la zona no interviene en ninguno de los tres.

`scripts/verificar-zona.mjs` cubre exactamente ese hueco. Para cada hostname canónico —la lista
vive en el propio script, que es la forma de que el repositorio **declare** lo que debe ser
cierto— comprueba:

| Comprobación | Qué caza |
|---|---|
| `/index.html` responde 307 | Que lo sirve el Worker y no nginx. Los dos van proxiados por Cloudflare, así que ni la IP ni `Server` los distinguen: el discriminador tuvo que salir midiendo |
| Las 8 cabeceras, **con su valor exacto** | Una CSP con una directiva de menos protege menos, y comparando solo nombres sería invisible |
| HSTS presente | Lo pone el borde, no `_headers`; si se cae, no lo nota nadie más |
| Ruta inexistente → 404 | Que el soft 404 no vuelva por la puerta de atrás al cambiar de origen |
| **Mismo HTML con dos `Accept` distintos** | Cualquier reescritura del borde |
| Nada que el navegador **descargue** viene de fuera | Terceros inyectados, contra ADR-0004 |

Las cabeceras se leen de `cloudflare/_headers` en vez de copiarse: una tercera lista escrita a
mano sería una tercera cosa que puede divergir, que es justo lo que U12 vigila entre las dos que
ya hay.

La quinta es la que importa y la que no se le habría ocurrido a nadie antes del 31 de julio.
**Cloudflare inyecta solo a peticiones de navegador**: con un `Accept` genérico el HTML sale byte
a byte idéntico al desplegado, y con `Accept: text/html` trae 359 bytes de más. Pedir la misma
página dos veces y comparar el tamaño **no depende de saber qué inyecta** — caza igual Rocket
Loader, la ofuscación de correo o lo que active mañana quien administre la zona.

Y no es una comprobación que pase por no medir nada: ahora mismo **falla**, y falla por los dos
motivos correctos.

```
❌ higerotech.com
    · el borde reescribe el HTML según quién lo pida: 81163 bytes con Accept genérico
      y 81522 con Accept:text/html (+359)
    · el navegador descargaría de terceros: https://static.cloudflareinsights.com/beacon.min.js/…
❌ www.higerotech.com
    · no se pudo alcanzar
```

Se engancha al workflow de despliegue **después** del suite contra `workers.dev`: ese paso prueba
que el despliegue salió bien; este prueba lo que recibe la gente.

## Cierre del cutover *(2026-07-31)*

Los dos hallazgos del paso 3 están resueltos, y apareció un tercero al cerrarlo.

| | Antes | Ahora |
|---|---|---|
| `www.higerotech.com` | NXDOMAIN | Sirve desde el Worker |
| Beacon de Web Analytics | Inyectado en toda la zona | Sin inyección: el HTML servido es byte a byte el desplegado |
| Suite E2E contra el apex | 54/58 | **58/58** |
| `verificar:zona` sobre el apex | ❌ 2 fallos | ✅ |

`www` se comprobó forzando la IP de Cloudflare, y pasa las seis: 307 en `/index.html`, las ocho
cabeceras, HSTS con `preload`, 404 real, HTML idéntico con dos `Accept` distintos y cero terceros.

### Un detalle operativo que cuesta media hora si no se sabe

Tras enganchar `www`, **el resolver local siguió devolviendo NXDOMAIN**, y `Clear-DnsClientCache`
no lo arregló. No era la configuración: era **caché negativa** — el SOA de la zona declara 1800 s,
así que cualquier resolver que preguntara por `www` mientras no existía se guarda ese «no existe»
durante media hora, y limpiar la caché del cliente no toca la del router ni la del ISP.

Confundir eso con un fallo de configuración lleva a deshacer algo que estaba bien. La forma de
distinguirlo en diez segundos: preguntar a un resolver público por DoH, o forzar la IP con
`curl --resolve`. Ambos daban verde mientras la máquina local seguía diciendo que no existía.

### Hallazgo 3 — la verificación del despliegue apuntaba a una pantalla de login

El primer despliegue tras enganchar los dominios propios **falló con 48 de 58 pruebas caídas**, y
el mensaje —`element(s) not found`— no decía nada útil. La causa: `*.workers.dev` había quedado
**detrás de Cloudflare Access**, así que devuelve un 302 a una pantalla de login. El suite estaba
midiendo esa pantalla.

Que la URL de preview quede protegida está bien —evita que un hostname no canónico sea
alcanzable e indexable—, pero deja el workflow verificando contra algo que no es el sitio. Y
había una razón más de fondo para cambiarlo: **`workers.dev` no pertenece a la zona**, así que
nunca podría haber visto lo que el borde añade. Era exactamente el hueco del Hallazgo 2.

**La verificación pasa a medir el hostname canónico.** Con eso se pierde la garantía que daba
derivar la URL de la salida de `wrangler deploy` —que lo verificado fuera lo recién publicado— y
hay que reponerla, porque es justo la que evita dar verde sobre una versión vieja. Se repone más
fuerte:

### La comprobación 7: lo publicado es el artefacto de este build

`verificar:zona` compara ahora **byte a byte** el HTML servido contra `dist/index.html`. Es una
garantía mejor que la de la URL derivada: aquella probaba que *una URL responde*, esta prueba que
**el contenido es el de este build**. Es la que ata las dos puntas, y la que faltaba el
2026-07-30, cuando todo estaba en verde sobre una versión de dos semanas antes.

Tres decisiones dentro:

- **Byte a byte y no por `ETag`.** El `ETag` que devuelve Cloudflare **no es el hash del
  contenido** —comprobado: `d058e423…` frente a `d11f6768…` del archivo—, así que compararlo no
  diría nada.
- **Con reintentos**, porque el borde puede servir la versión anterior unos segundos tras
  desplegar. Reintentar una *lectura* no enmascara nada: si nunca converge, falla igual.
- **Si `dist/` no existe, lo dice en voz alta** en vez de saltarse la comprobación. Una
  comprobación que se salta en silencio es indistinguible de una que pasa.

Y mide: alterando `dist/index.html` a propósito, falla con
`lo publicado no es el artefacto de este build: 81163 bytes servidos frente a 81180 en dist/`.

## Rollback

El túnel sigue configurado y el contenedor sigue corriendo, así que volver es **una edición del
ingress**: reañadir `www` apuntando a `http://<IP del host>:80` y quitar el dominio propio del
Worker. Sin reconstruir nada.

Es la primera vez que este repositorio tiene un rollback que no depende de conservar una imagen
—el problema que apareció en el cutover del 2026-07-30, cuando la imagen anterior había
desaparecido del almacén y `docker commit` ya no podía recuperarla—.

## Lo que hay que revisar en las pruebas

La migración deja **dos pruebas midiendo el vacío** si no se tocan:

| Prueba | Qué comprueba | Contra el Worker |
|---|---|---|
| E3.6 | Que no se filtre `nginx/x.y` en `/` | Trivialmente cierto: no hay nginx |
| E9.2 | Lo mismo en una página de error | Ídem |

### Los dos caminos no redirigen igual

Medido el 2026-07-31. No es un fallo —ambos comportamientos son correctos— pero conviene tenerlo
escrito antes de mover el DAST:

| Ruta | Worker | nginx |
|---|---|---|
| `/index.html` | **307 → `/`** | 200 |
| `/404.html` | **307 → `/404`** (200) | **404** |

Vienen de sitios distintos. En el Worker es `html_handling: "auto-trailing-slash"`, que quita la
extensión y consolida la URL canónica — bueno para SEO. En nginx, `/404.html` devuelve 404 porque
está declarada como página **interna**, un idiom clásico del servidor.

**Ninguna prueba lo detectó**, y con razón: Playwright sigue redirecciones, así que ambas rutas
acaban en el mismo contenido y las aserciones se cumplen. Pero el escaneo **DAST apunta a
`/404.html` explícitamente** como segundo objetivo, y contra el Worker escanearía el destino tras
la redirección. Hay que decidir si eso basta o si el segundo objetivo pasa a ser `/404`.

Quedarse así sería introducir a propósito el patrón que este repositorio lleva semanas
desmontando: una comprobación que no puede fallar. **Acción:** marcarlas como específicas del
contenedor y, para el Worker, comprobar lo que sí tiene sentido allí —que la respuesta no
exponga cabeceras de infraestructura inesperadas—.

El resto del suite es agnóstico: apunta a `BASE_URL` y comprueba comportamiento, no
implementación.

## Lo que este plan no resuelve

- **La observabilidad sigue sin existir** (A09, Gate 5). Un Worker tiene analítica y logs
  propios, lo que hace el hueco más fácil de cerrar, pero cerrarlo no es parte de esto.
- **El SBOM y la firma de imagen** siguen pendientes en el Gate 4; aplican al contenedor, que
  sigue vivo como contingencia.
- **El gate `license`** sigue sin herramienta.
- **El `preload` de HSTS** queda desbloqueado por el apex, pero solicitarlo sigue siendo una
  decisión aparte: entrar en la lista es prácticamente irreversible.
