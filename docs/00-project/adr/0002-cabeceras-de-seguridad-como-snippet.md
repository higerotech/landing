# ADR-0002: Declarar las cabeceras de seguridad en un snippet incluido en cada `location`

* **Estado:** accepted
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 02-design
* **Versión:** 1.0.0
* **ID:** ADR-0002
* **Supersede / Superseded-by:** —
* **Controles OWASP afectados:** A02, A05, A08

## Contexto

La configuración original declaraba las cuatro cabeceras de seguridad una sola vez, en el
bloque `server`:

```nginx
server {
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff"    always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy     "geolocation=(), microphone=(), camera=()" always;

    location /assets/ {
        add_header Cache-Control "public, max-age=2592000, immutable";   # ← rompe la herencia
    }
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";            # ← rompe la herencia
    }
}
```

Esto parece correcto pero **no funciona**. En nginx, las directivas `add_header` se heredan
del nivel superior *solo si el nivel actual no declara ninguna `add_header` propia*. Cuanto
un `location` añade su `Cache-Control`, descarta el conjunto completo del bloque `server`.

El sufijo `always` no cambia esto: `always` controla si la cabecera se emite también en
respuestas de error, no la herencia.

Consecuencia real medida: `/` resuelve vía `index index.html` a `location = /index.html`,
así que **la página principal se servía sin ninguna de las cuatro cabeceras**. Los assets,
igual. Las cabeceras solo llegaban a rutas que no coincidían con ningún `location` con
`add_header` — es decir, casi ninguna.

Es un fallo silencioso: la configuración es válida, nginx arranca sin avisos y una lectura
casual del archivo sugiere que la protección está puesta.

## Decisión

Extraer las cabeceras a `security-headers.conf` e **incluirlo explícitamente en cada
bloque `location`**:

```nginx
location = /index.html {
    include /etc/nginx/snippets/security-headers.conf;
    add_header Cache-Control "no-cache, must-revalidate" always;
}
```

Se aprovecha para ampliar el conjunto: `Content-Security-Policy`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, y `X-Frame-Options: DENY` en
lugar de `SAMEORIGIN` (el sitio no se enmarca a sí mismo en ningún punto).

Se añade al pipeline un job que verifica las cabeceras **en la home y en un asset**, no solo
en la raíz: comprobar únicamente `/` no habría detectado este bug en los assets.

## Alternativas consideradas

| Opción | Pros | Contras | Riesgo de seguridad |
|---|---|---|---|
| **Snippet incluido en cada `location` (elegida)** | Funciona; explícito; el `include` documenta la intención | Repetir una línea por bloque | Ninguno |
| Quitar los `add_header Cache-Control` y usar solo `expires` | La herencia se conserva (`expires` no la rompe) | Se pierde `immutable`, que evita revalidaciones en assets versionados | Ninguno, pero peor rendimiento |
| Repetir las cabeceras literalmente en cada `location` | Sin dependencia de archivo externo | Seis copias que se desincronizan en el primer cambio | **Alto**: la deriva es cuestión de tiempo |
| Emitir las cabeceras desde el proxy/túnel del borde | Centralizado para todos los sitios del host | La imagen deja de ser autocontenida; probar en local ya no representa producción | Medio: la protección depende de infraestructura fuera del repo |
| `more_set_headers` (módulo `headers-more`) | Sí se hereda de forma intuitiva | No está en `nginx:alpine`; obliga a compilar o cambiar de imagen base | Medio: amplía la superficie de supply chain (A03) |

## Consecuencias

**Positivas**
- Las cabeceras llegan a todas las rutas. Verificado con `curl -sI` sobre `/`, `/index.html`,
  `/assets/fonts/fonts.css`, `/robots.txt` y una ruta inexistente.
- Un único punto de edición para toda la política.
- El comentario de cabecera del snippet explica *por qué* se incluye repetidamente, para que
  nadie lo "simplifique" de vuelta al bug.

**Negativas / deuda asumida**
- Un `location` nuevo que olvide el `include` queda sin cabeceras. Mitigación: el job de CI
  falla si alguna ruta las pierde. Es una salvaguarda de proceso, no estructural.
- El snippet vive en `/etc/nginx/snippets/`, una ruta que el `Dockerfile` debe crear al
  copiar. Queda acoplado a la imagen.

**Impacto en threat model**
- Cierra T2 (clickjacking) y T3 (MIME sniffing), que en la práctica estaban **sin control**
  pese a figurar como mitigados en el README original.
- Habilita T4 (CSP), que antes no existía.
