# Plan de despliegue — Cloudflare Workers con static assets

* **Estado:** draft — **preparado en el repositorio, sin ejecutar en Cloudflare**
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 05-deployment
* **Versión:** 0.1.0
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

1. **Token de API** con permiso `Workers Scripts: Edit` sobre la cuenta, y **solo eso**. Se
   guarda como secreto `CLOUDFLARE_API_TOKEN` del repositorio, junto a `CLOUDFLARE_ACCOUNT_ID`.
   Es una credencial que puede desplegar: alcance mínimo y rotable.
2. **Dominios propios del Worker** para `higerotech.com` y `www.higerotech.com`. Cloudflare crea
   los registros DNS necesarios — incluido el del **apex, que hoy no existe**.
3. **Retirar del ingress del túnel** las entradas de `www` y del apex, dejando `demo.` y `web.`.

## Secuencia de cutover

Diseñada para que en ningún paso el sitio quede sin servir, y para poder volver atrás en
minutos.

| # | Paso | Cómo se comprueba |
|---|---|---|
| 1 | Añadir los archivos del Worker al repositorio y desplegar a un `*.workers.dev` | Las 58 E2E y el DAST contra esa URL, con `BASE_URL` apuntando ahí |
| 2 | Enrutar **solo el apex** al Worker | `curl -sI https://higerotech.com/` deja de dar 530. `www` sigue por el túnel: si algo va mal, el tráfico real no se entera |
| 3 | Verificar el apex con el suite completo | Cabeceras, 404 real, CSP, sin terceros |
| 4 | Mover `www` al Worker y quitarlo del ingress | Paso 4 de §Verificar antes de publicar, ahora contra el Worker |
| 5 | Dejar `demo.` en el túnel como estaba | `curl -sI https://demo.higerotech.com/` sigue sirviendo desde el contenedor |

**El paso 2 es deliberadamente el apex y no `www`.** Hoy el apex no sirve a nadie —responde
530—, así que es el único hostname donde un fallo no tiene consecuencias. Se estrena la
infraestructura nueva donde no hay tráfico que perder.

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
