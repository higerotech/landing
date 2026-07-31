# ADR-0006: Servir la landing desde Cloudflare Workers con static assets

* **Estado:** proposed
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 05-deployment
* **Versión:** 1.0.0
* **ID:** ADR-0006
* **Supersede / Superseded-by:** — (no deroga ADR-0002; ver §Consecuencias)
* **Controles OWASP afectados:** A02, A03, A04, A08

## Contexto

Hoy la landing se sirve así:

```
Visitante → Cloudflare → túnel cloudflared → 192.168.1.44:80 → nginx en Docker
```

Eso funciona, pero arrastra tres problemas que este repositorio ya documentó pagando por ellos:

1. **Depende de un host doméstico.** Un solo nodo, una IP privada, sin réplica. Si esa máquina
   se apaga, el sitio se cae — y el charter promete 99,5 % de disponibilidad.
2. **La deriva entre repositorio y producción es fácil y silenciosa.** Ya ocurrió: durante dos
   semanas el sitio publicado no servía **ninguna** corrección del repositorio, con los gates en
   verde todo ese tiempo. El despliegue era manual y nadie lo comprobaba desde fuera.
3. **El apex no resuelve.** `higerotech.com` responde 530 y no figura en el ingress, mientras
   `canonical`, los tres `hreflang`, `og:url`, `sitemap.xml` y `robots.txt` apuntan ahí. Bloquea
   además el `preload` de HSTS, que ya cumple los otros tres requisitos.

Cloudflare Workers con *static assets* sirve archivos estáticos desde el borde, con despliegue
por `wrangler` y dominios propios. Es exactamente la forma del problema: un sitio estático, sin
backend, que hoy viaja hasta una casa y vuelve.

### Sobre «apuntar el túnel al Worker»

La petición inicial fue enrutar el túnel hacia el Worker. **No es lo que se hace, y conviene
dejar escrito por qué**: un túnel existe para exponer un origen *privado* sin abrir puertos. Si
el contenido vive en un Worker, ya está en el borde. Enrutarlo por el túnel sería
Cloudflare → LAN → Cloudflare: más latencia y seguir dependiendo del host que este cambio busca
eliminar. Lo que se apunta al Worker es el **hostname**, no el túnel.

## Decisión

**Servir el apex y `www` desde un Worker con static assets, desplegado por GitHub Actions con
`wrangler`.** El túnel conserva `demo.` y `web.` apuntando al contenedor local.

| Hostname | Origen | Papel |
|---|---|---|
| `higerotech.com` | **Worker** | Canónico. Desbloquea el SEO y el `preload` de HSTS |
| `www.higerotech.com` | **Worker** | El que hoy recibe el tráfico |
| `demo.higerotech.com` | Túnel → contenedor | Pruebas contra lo que haya levantado en el host |
| `web.higerotech.com` | Túnel → contenedor | Sin cambio; no es hostname canónico |

Piezas dentro del repositorio:

- `wrangler.jsonc` con `assets.directory`, `html_handling` y
  **`not_found_handling: "404-page"`** — verificado que existe: conserva el 404 real, que costó
  un bug y un ADR conseguir.
- Un archivo **`_headers`** con las cabeceras de seguridad. Soportado por Workers static assets.
- Workflow de GitHub Actions que despliega con `wrangler deploy` al mergear en `main`.

**Docker y nginx se conservan como plan de contingencia**, no como camino muerto. Y se mantienen
honestos gratis: las 58 pruebas E2E y el escaneo DAST siguen corriendo contra el contenedor en
cada PR, así que el respaldo está verificado de forma continua. Un respaldo sin probar es un
respaldo que falla el día que hace falta.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Worker con static assets (elegida)** | Borde global; sin host propio; despliegue automatizado y auditable; resuelve el apex | Dos fuentes de cabeceras que pueden divergir; el `Server` pasa a ser de Cloudflare | Bajo, con la mitigación de §Consecuencias |
| Cloudflare Pages | Igual de simple, pensado para estáticos | Producto en convergencia hacia Workers; Cloudflare recomienda Workers para lo nuevo | Igual |
| Seguir con túnel + nginx | Cero cambios; ya funciona | No arregla el host único, ni la deriva, ni el apex | Igual que hoy |
| Túnel apuntando al Worker | — | Cloudflare → LAN → Cloudflare. Peor en todo | Igual |

## Consecuencias

**Positivas**

- El sitio deja de depender de una máquina y una IP privada.
- El despliegue pasa de manual a automatizado y trazable: se acaba la clase de deriva que tuvo
  producción dos semanas atrás del repositorio.
- **El apex queda enrutado**, lo que desbloquea de una vez el canonical, el `sitemap`, el
  `og:url` y el `preload` de HSTS.
- `demo.` se convierte en un entorno de pruebas real contra el contenedor local.

**Negativas / deuda asumida**

- **Dos fuentes para las mismas cabeceras**: `security-headers.conf` (nginx) y `_headers`
  (Worker), sin build que las sincronice. Es la misma clase de deriva que ya obligó a escribir
  U2.5 para el `@font-face` inlinado. **Mitigación: una prueba que compare ambas y falle si
  divergen.** Sin ella, esta decisión introduce el problema que el repositorio lleva semanas
  corrigiendo.
- **Algunas pruebas quedarían verdes sin medir nada.** E3.6 y E9.2 comprueban que no se filtre
  `nginx/x.y`; contra un Worker eso es trivialmente cierto porque no hay nginx. Hay que
  reetiquetarlas como específicas del contenedor y no dejarlas pasar por verificación del sitio
  publicado.
- **El respaldo hay que mantenerlo vivo.** Se acepta porque el suite ya corre contra el
  contenedor; si algún día deja de hacerlo, la contingencia deja de ser real y este párrafo es el
  que hay que releer.
- Dependencia operativa nueva: un token de API de Cloudflare como secreto del repositorio, con
  permiso de edición de Workers. Es una credencial que puede desplegar: alcance mínimo y rotable.

**No deroga ADR-0002.** El snippet de cabeceras por `location` sigue siendo correcto para nginx,
que sigue existiendo. Lo que cambia es que deja de ser el único camino a producción.

**Impacto en threat model**

- Reduce **T16** (caída no detectada): el borde de Cloudflare sustituye a un host doméstico.
- Reduce **T9** (HTTP plano entre borde y nginx): en el camino del Worker ese tramo desaparece.
- Introduce un **riesgo nuevo**: el token de despliegue en el CI. Pendiente de registrar como
  amenaza con su DREAD cuando esta decisión pase a `accepted`.
