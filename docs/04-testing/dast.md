# DAST — Escaneo dinámico con ZAP baseline

* **Estado:** **implementado y validado** — 0 hallazgos fuera de los aceptados
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.2.0
* **Validación:** 2026-07-31 — cobertura del rastreo medida y contrastada con un escaneo activo
* **Gate:** cierra el último ítem de la pirámide del Gate 3 y el gate canónico **DAST** del Gate 4
* **Herramienta:** `ghcr.io/zaproxy/zaproxy:stable` por Docker
* **Ejecución:** `npm run dast` — ~2 min contra el contenedor

## Resultado

```
FAIL-NEW: 0   WARN-NEW: 0   IGNORE: 3   PASS: 64
```

## Por qué Docker y no la acción de GitHub

La acción `zaproxy/action-baseline` es cómoda, pero **solo se ejecuta en el runner**. Un gate
que no se puede correr en la máquina de quien lo depura se depura a ciegas: se empuja un commit,
se esperan tres minutos, se lee un log. Con la imagen por Docker el comando es literalmente el
mismo en local y en CI.

Ventaja secundaria: **no añade dependencias npm**, así que el gate SCA no se entera. Es el mismo
criterio que descartó `@lhci/cli` en el presupuesto de rendimiento.

## Lo que se arregló

**`Cross-Origin-Embedder-Policy` ausente (ZAP 90004, Low).** El sitio ya emitía COOP y CORP;
faltaba el tercero de la tríada. Añadido `require-corp`, que es seguro aquí **precisamente**
porque no se carga nada de otro origen (ADR-0004): esa directiva rompería cualquier recurso
cross-origin sin CORP, y no hay ninguno. Verificado con las E2E de CSP y fuentes.

## Lo que se acepta, y por qué

`.zap/rules.tsv` es la lista **completa y explícita**. Lo que no está ahí queda en aviso, y
`zap-baseline.py` sale con código 2 ante cualquier aviso: un hallazgo nuevo rompe el build.

| Regla | Riesgo ZAP | Motivo |
|---|---|---|
| **10055** CSP `unsafe-inline` | Medium | **T4** del threat model, aceptado con DREAD 5,6. El CSS y el JS viven en `index.html` por **ADR-0003**, que fija el disparador de revisión: se elimina en cuanto se extraigan a archivos propios. Mitigado mientras tanto porque no existe vector de entrada de contenido no confiable, cosa que vigila la unitaria U3.5 |
| **10109** Modern Web Application | Informational | No es un hallazgo: ZAP hace constar que la página usa JS y que un escaneo pasivo no lo ve todo. Cierto, y de eso se ocupan las 51 E2E en navegador real |
| **10049** Storable but Non-Cacheable | Informational | Deliberado: el HTML va con `no-cache, must-revalidate` para que un despliegue se vea de inmediato. Los assets sí van `immutable` |

**Regla de la casa, escrita en el propio archivo:** nada se silencia sin un motivo y sin un
lugar donde ese motivo esté registrado como riesgo. Si una línea de `rules.tsv` no puede señalar
a un ADR o a una amenaza del threat model, sobra.

## Se verificó que el gate puede fallar

Un gate que no se puede poner en rojo no es un gate. Se comprobó quitando cabeceras a propósito,
y el primer intento enseñó algo:

| Cabecera retirada | Resultado | Lectura |
|---|---|---|
| `X-Frame-Options` | **PASS**, exit 0 | ZAP acepta `frame-ancestors 'none'` de la CSP como equivalente. **El sitio seguía protegido**: no era un fallo del gate |
| `X-Content-Type-Options` | **WARN-NEW: 1**, exit 2 | Sin sustituto en la CSP, el gate lo detecta |

La primera fila estuvo a punto de registrarse como «el gate no detecta nada». Verificar con un
solo caso habría dado esa conclusión, y habría sido falsa.

## Validación del gate *(2026-07-31)*

Antes de cerrar el Gate 3 con esta evidencia se validó que la evidencia **mide algo**. Dos
preguntas, dos respuestas medidas.

### ¿Recorre el sitio o se queda en la home?

Se midió desde el **log de nginx**, no desde el informe de ZAP —que solo dice dónde se levantó
cada alerta, no qué se visitó—. El primer intento dio «4 peticiones, todas a `/`» y estuvo a
punto de registrarse como hallazgo grave. Era falso: `nginx.conf` tiene `access_log off` en
assets, `robots.txt` y `sitemap.xml`, así que el propio log escondía el tráfico.

Repetido contra un contenedor de un solo uso con el registro completo:

```
7 GET /            1 GET /assets/logo_white_trans.png
1 GET /robots.txt  1 GET /assets/isotipo_charcoal_lg.png
1 GET /sitemap.xml 1 GET /assets/isotipo.svg
                   2 GET /assets/fonts/*.woff2
```

**8 URLs, 14 peticiones.** El spider funciona. Pero apareció un punto ciego real: **nunca pedía
la página 404**, porque el spider solo sigue enlaces y a `/404.html` no apunta ninguno — es
nginx quien la sirve ante una ruta inexistente. Es una página que los visitantes sí ven.

Corregido: el escaneo tiene ahora **dos objetivos**, el sitio y `/404.html`. Ambos limpios, 64
reglas cada uno. Que E9.2 y E9.3 ya comprueben las cabeceras y la versión en un 404 no lo cubría:
esas son dos aserciones concretas; aquí pasan 64 reglas pasivas.

### ¿Basta con un escaneo pasivo?

Era una afirmación —«no hay superficie que un escaneo activo exploraría»— y ahora es un hecho
medido. Se ejecutó una vez `zap-full-scan.py`, que **ataca**: SQL injection, inyección de
comandos, SSTI, path traversal, XSS reflejado, XXE, deserialización.

```
FAIL-NEW: 0   WARN-NEW: 0   IGNORE: 1   PASS: 140
```

**140 reglas, más del doble que las 64 del baseline, y ni un hallazgo nuevo.** El único aviso fue
el `unsafe-inline` ya aceptado.

Queda como comando bajo demanda —`npm run dast -- --activo`— y **no** como gate: en un sitio sin
formularios, sin API y sin sesión, ejecutarlo en cada PR gasta minutos para confirmar lo mismo.

**El disparador para volver a él está automatizado.** La premisa «no hay superficie de entrada»
la vigila **U11.1**: si algún día aparece un formulario o un `<input>`, esa prueba se pone roja,
y ese es el momento de pasar el baseline a `full-scan`. La premisa no envejece en silencio.

## Alcance: qué es y qué no es un baseline

`zap-baseline.py` hace un escaneo **pasivo**: rastrea la aplicación y analiza las respuestas,
pero **no ataca**. No inyecta payloads, no fuerza rutas, no prueba autenticación.

Para este sitio esa limitación importa poco, y ya no es una suposición: el escaneo activo se
ejecutó y no encontró nada (ver §Validación del gate). No hay formularios, ni API, ni sesión, ni
base de datos — el 100 % del contenido es material de marketing público servido estáticamente.

Si algún día aparece un formulario o un endpoint, el baseline se queda corto y toca
`zap-full-scan.py`. Ese momento lo señala **U11.1**, no la memoria de nadie.

## En el CI

Job `DAST (ZAP baseline)`: construye la imagen, levanta el contenedor en 8082 y escanea. Sube
los informes JSON y HTML como artefacto **siempre**, no solo al fallar.

`host.docker.internal` con `--add-host=...:host-gateway` funciona igual en Docker Desktop y en
los runners de Linux; `--network host` no, y por eso no se usa.
