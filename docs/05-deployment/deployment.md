# Despliegue — Landing corporativa Higerotech

* **Estado:** review
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 05-deployment
* **Versión:** 0.3.0
* **Gate:** 4 — **parcial**
* **Entorno objetivo:** Host único con Docker; borde expuesto mediante túnel
* **Estrategia de release:** Reemplazo directo del contenedor (sin blue-green ni canary)

## Topología

```mermaid
C4Deployment
    title Despliegue — Landing corporativa

    Deployment_Node(internet, "Internet", "Red publica") {
        Deployment_Node(cliente, "Dispositivo del visitante", "Movil o escritorio") {
            Container(navegador, "Navegador", "Chrome / Safari / Firefox", "Renderiza y ejecuta el JS de la pagina")
        }
    }

    Deployment_Node(host, "Host Docker", "Linux, un solo nodo") {
        Deployment_Node(tunel, "Contenedor de tunel", "cloudflared u equivalente") {
            Container(borde, "Terminacion TLS", "Tunel saliente", "Publica el sitio sin abrir puertos entrantes")
        }
        Deployment_Node(cont, "higerotech-landing", "Docker, rootfs solo lectura, cap_drop ALL, 0.5 CPU / 128 MB") {
            Container(nginx, "nginx", "1.30-alpine", "Sirve estaticos y aplica cabeceras de seguridad")
            Container(archivos, "Contenido", "index.html, 404.html, assets, robots, sitemap", "Horneado en la imagen")
        }
    }

    Rel(navegador, borde, "Solicita el sitio", "HTTPS/443")
    Rel(borde, nginx, "Reenvia", "HTTP/80 red interna del host")
    Rel(nginx, archivos, "Lee", "sistema de archivos de solo lectura")

    UpdateElementStyle(nginx, $bgColor="#1168bd", $fontColor="#ffffff")
    UpdateElementStyle(borde, $borderColor="#b30000", $fontColor="#b30000")
    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

*Eje estructura · Fase 05 · Dónde corre cada contenedor.*

Detalle relevante para la seguridad: el túnel es **saliente**, así que el host no abre
puertos entrantes al exterior. Eso reduce mucho la superficie de red y es parte de por qué
T10 (saturación) se acepta sin rate limiting.

El software del túnel es **cloudflared**, en modo token (`cloudflared tunnel run --token …`),
confirmado por `docker inspect landing-tunnel` el 2026-07-30. Consecuencia operativa
importante: en ese modo el *ingress* —a qué origen reenvía— **no está en este repositorio ni
en el host**, se administra en el panel de Cloudflare. Antes de recrear el contenedor de la
landing hay que comprobar allí a qué apunta: si el origen está fijado a la IP del contenedor
en la red `bridge` por defecto, recrearlo con `docker compose` lo mueve a otra red y a otro
puerto, y el sitio público deja de responder aunque el contenedor esté sano.

`<TODO: confirmar quién administra la cuenta de Cloudflare y anotar aquí el origen
configurado, para que deje de ser conocimiento tácito>`

## Pipeline

```mermaid
flowchart TB
    PR([Pull request]) --> B[Build de la imagen<br/>incluye nginx -t]
    B --> SEC{Gates de seguridad}

    SEC --> G1[gitleaks<br/>secretos]
    SEC --> G2[Semgrep<br/>SAST]
    SEC --> G3[Trivy<br/>vulnerabilidades de imagen]
    SEC --> G4[Trivy<br/>SBOM CycloneDX]
    SEC --> G5[Cabeceras en 4 rutas]
    SEC --> G6[Codigos 404 reales]
    SEC --> G7[Sin version de nginx expuesta]

    G1 & G2 & G3 & G4 & G5 & G6 & G7 --> OK{Todos en verde}
    OK -->|no| STOP([Merge bloqueado])
    OK -->|si| MERGE([Merge a main])

    MERGE --> TAG[Tag SemVer]
    TAG --> PUB[docker build + push]
    PUB --> DEP[docker compose up -d]
    DEP --> VER[Verificacion post-despliegue]
    VER -->|falla| RB[Rollback]
    VER -->|pasa| FIN([Publicado])

    RB --> PREV[docker compose up -d con el tag anterior]
    PREV --> VER

    style STOP fill:#b30000,color:#ffffff
    style RB fill:#b30000,color:#ffffff
    style FIN fill:#2d7d46,color:#ffffff
```

*Eje comportamiento · Fase 05 · Pipeline y ruta de rollback.*

Los pasos `MERGE` en adelante son **manuales hoy**. Las siete comprobaciones G1–G7 están
automatizadas en `.github/workflows/security-gates.yml` y las siete pasan: el repositorio ya
está conectado a GitHub Actions, así que Semgrep y Trivy ejecutan de verdad.

> **`Merge bloqueado` es la intención, no lo que ocurre.** Hoy nada impide mergear con el
> pipeline en rojo. La org está en plan Free y el repositorio es privado, combinación en la que
> GitHub no ofrece branch protection ni rulesets, así que el estado del CI no es una condición
> para el merge. La única barrera existente es `.githooks/pre-push`, que es local y **no
> consulta el CI**: impide empujar a `main`, no mergear una PR roja. Cerrar la brecha exige
> subir a GitHub Team o hacer el repositorio público (ver `CHANGELOG.md` §Unreleased).

Los gates G5, G6 y G7 son específicos de este proyecto y merecen justificación: existen para
que los tres defectos corregidos en `7c7bc78` no puedan volver. G5 comprueba las cabeceras en
**cuatro rutas distintas**, no solo en `/`, porque el bug original era precisamente que
llegaban a unas rutas y a otras no.

## Verificación

Comprobaciones ejecutadas contra la imagen construida el **2026-07-29**. Reproducibles con
`docker compose up -d --build`.

### Cabeceras de seguridad

```bash
curl -sI http://localhost:8080/ | grep -i -E 'frame|nosniff|referrer|permissions|content-security'
```

Resultado sobre `/`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

Verificado presente además en `/index.html`, `/assets/fonts/fonts.css`,
`/assets/og-card.png`, `/robots.txt`, `/sitemap.xml` y rutas inexistentes.

### Códigos de estado y tipos de contenido

| Ruta | Código | `Content-Type` | `Cache-Control` |
|---|---|---|---|
| `/` | 200 | `text/html` | `no-cache, must-revalidate` |
| `/index.html` | 200 | `text/html` | `no-cache, must-revalidate` |
| `/robots.txt` | 200 | `text/plain` | `max-age=86400` |
| `/sitemap.xml` | 200 | `text/xml` | `max-age=86400` |
| `/assets/fonts/fonts.css` | 200 | `text/css` | `public, max-age=2592000, immutable` |
| `/assets/fonts/inter-latin.woff2` | 200 | `font/woff2` | `public, max-age=2592000, immutable` |
| `/ruta-que-no-existe` | **404** | `text/html` | — |
| `/assets/no-existe.png` | **404** | `text/html` | — |

`Server: nginx` — sin número de versión (`server_tokens off`).

### Comportamiento en navegador

Verificado en Chrome contra la imagen construida:

| Comprobación | Resultado |
|---|---|
| Fuentes cargadas | `Inter 400 700` y `Space Grotesk 400 700` — variables, same-origin |
| Familia aplicada a `h1` | `Space Grotesk` |
| SVG sin `aria-hidden` | 0 de 34 |
| Saltos de nivel de encabezado | Ninguno |
| Botón de WhatsApp | Oculto (sin número configurado) — no se publica CTA muerto |
| Año del pie | Dinámico |
| Cambio a EN | `html lang="en"`, `aria-pressed` sincronizado, preferencia guardada |
| Cuatro cambios de idioma seguidos | 130 nodos i18n intactos; `<span class="grad">`, `<strong>` y el año conservados |
| `?lang=en` | Aplica inglés desde la carga; URL compartible |
| Menú móvil | Panel abre/cierra; Escape cierra; pulsar enlace cierra; áreas táctiles de 51 px |
| Enmarcado en iframe | **Bloqueado** por `frame-ancestors 'none'` |
| Errores de consola | Ninguno |

Nota metodológica: la media query móvil se verificó por CSSOM y con las reglas aplicadas
manualmente, porque la ventana del entorno de pruebas no bajaba de 2560 px. La lógica JS sí
se ejecutó de verdad. Queda como candidata a prueba E2E real (Gate 3).

## Procedimiento de despliegue

```bash
# 1. Construir y verificar la configuracion (nginx -t corre dentro del build)
docker compose build

# 2. Levantar
docker compose up -d

# 3. Verificar antes de dar por bueno
curl -sI http://localhost:8080/ | grep -ci -E 'frame|nosniff|referrer|permissions|content-security'   # => 5
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/no-existe                              # => 404
docker compose ps                                                                                      # => healthy
```

Si el paso 3 no da esos tres resultados, no se publica: se hace rollback.

## Rollback

| Disparador | Acción | Tiempo objetivo |
|---|---|---|
| Cabeceras ausentes en cualquier ruta tras desplegar | Rollback inmediato | < 5 min |
| Healthcheck en `unhealthy` más de 2 minutos | Rollback inmediato | < 5 min |
| La página no renderiza o queda en blanco | Rollback inmediato | < 5 min |
| Error 5xx sostenido | Rollback inmediato | < 5 min |
| Regresión visual o de copy | Evaluar; corregir hacia adelante si no es crítico | < 24 h |

```bash
# Volver al tag anterior
docker compose down
docker tag higerotech/landing:<tag-anterior> higerotech/landing:latest
docker compose up -d

# Verificar que el rollback funciono
curl -sI http://localhost:8080/ | head -1
docker compose ps
```

**Requisito para que esto funcione:** las imágenes deben etiquetarse con la versión, no solo
con `latest`. Hoy `docker-compose.yml` fija `image: higerotech/landing:latest`, así que **no
hay imagen anterior a la que volver**. Es una carencia real del runbook.

`<TODO: etiquetar las imágenes con el tag SemVer del release y conservar al menos las dos
últimas. Sin esto, el procedimiento de rollback descrito arriba no es ejecutable.>`

## Plan de cutover

```mermaid
gantt
    title Cutover a la version corregida
    dateFormat YYYY-MM-DD
    section Preparacion
    Confirmar dominio y numero de WhatsApp  :crit, a1, 2026-07-30, 1d
    Etiquetar imagen actual como respaldo   :a2, after a1, 1d
    Conectar el pipeline a GitHub Actions   :done, a3, 2026-07-30, 1d
    section Corte
    Diagnosticar el contenedor unhealthy    :crit, b1, after a2, 1d
    Desplegar la version corregida          :crit, b2, after b1, 1d
    Verificar cabeceras y codigos           :b3, after b2, 1d
    section Seguimiento
    Validar previsualizacion social         :c1, after b3, 1d
    Monitor externo de disponibilidad       :crit, c2, after b3, 2d
    Enviar sitemap a buscadores             :c3, after c1, 1d
```

*Eje trazabilidad · Fase 05 · Secuencia de corte y dependencias.*

Las tres tareas `crit` marcan el camino crítico. La primera lo es porque el dominio y el
número condicionan contenido ya desplegado (canonical, `hreflang`, Open Graph y el CTA de
WhatsApp): desplegar antes de confirmarlos obliga a redesplegar.

## Estado del Gate 4

Cerrado: configuración validada en build, cabeceras verificadas en todas las rutas,
contenedor endurecido, límites de recursos, runbook con disparadores y plan de cutover.

Abierto: pipeline real conectado, SBOM, imagen anclada por digest, firma de imagen,
etiquetado de versiones que haga ejecutable el rollback, y documentación del borde TLS.

Detalle en [`.ai-dlc/gates/gate-4-deployment.md`](../../.ai-dlc/gates/gate-4-deployment.md).

## Hallazgo operativo — causa encontrada, redespliegue pendiente

El 2026-07-29, al listar los contenedores del host, se observó:

```
higerotech-landing | Up 24 hours (unhealthy) | 0.0.0.0:80->80/tcp
```

Un `landing-tunnel` corriendo en paralelo sugiere que ese contenedor es el que publica el
sitio. Lleva 24 horas con el healthcheck fallando y **nadie se enteró**: es la amenaza T16
del threat model materializada.

**Diagnóstico (2026-07-30).** El `unhealthy` no era una avería: era un defecto del propio
repositorio. El healthcheck apuntaba a `http://localhost/`, nombre que el `/etc/hosts` de la
imagen resuelve también a `::1`; el `wget` de busybox intenta IPv6 primero y `nginx.conf` solo
declara `listen 80`. Todos los chequeos daban `connection refused` —611 seguidos— mientras
`nginx` respondía 200 con normalidad. Estaba en `Dockerfile` y en `docker-compose.yml`, así
que ninguna instancia de esta imagen ha estado `healthy` nunca. Ya corregido a `127.0.0.1`.

Dos consecuencias que conviene no perder de vista:

1. El disparador de rollback «healthcheck en `unhealthy` más de 2 minutos» de la sección
   anterior era **inejecutable** hasta este arreglo: aplicado al pie de la letra habría
   revertido cada despliegue, incluidos los buenos.
2. El contenedor en producción no salió de este `docker-compose.yml`. Se creó el 2026-07-14
   con `docker run`: publica en el puerto 80 y no en 8080, y `docker inspect` devuelve
   `ReadonlyRootfs: false` y `CapDrop: []`. El endurecimiento descrito en este documento está
   en el archivo, no en lo que sirve el sitio ahora mismo.

Ese contenedor sirve la versión **anterior** a las correcciones. Sigue sin tocarse: sustituirlo
afecta a un sitio público y el orden correcto es comprobar primero el origen configurado en el
túnel (ver §Topología), porque `docker compose up` lo movería a otra red y a otro puerto.

Pendiente: confirmar el origen del túnel y redesplegar con `docker compose`.
