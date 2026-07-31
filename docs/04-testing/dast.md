# DAST — Escaneo dinámico con ZAP baseline

* **Estado:** **implementado** — 0 hallazgos fuera de los aceptados
* **Fecha:** 2026-07-31
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 04-testing
* **Versión:** 0.1.0
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

## Alcance: qué es y qué no es un baseline

`zap-baseline.py` hace un escaneo **pasivo**: rastrea la aplicación y analiza las respuestas,
pero **no ataca**. No inyecta payloads, no fuerza rutas, no prueba autenticación.

Para este sitio esa limitación importa poco: no hay formularios, ni API, ni sesión, ni base de
datos — el 100 % del contenido es material de marketing público servido estáticamente. La
superficie que un escaneo activo exploraría no existe. Si algún día aparece un formulario o un
endpoint, este documento es el que hay que releer: entonces el baseline se queda corto y toca
`zap-full-scan.py`.

## En el CI

Job `DAST (ZAP baseline)`: construye la imagen, levanta el contenedor en 8082 y escanea. Sube
los informes JSON y HTML como artefacto **siempre**, no solo al fallar.

`host.docker.internal` con `--add-host=...:host-gateway` funciona igual en Docker Desktop y en
los runners de Linux; `--network host` no, y por eso no se usa.
