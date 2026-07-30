# Higerotech — Landing Page

[![Gates de seguridad](https://img.shields.io/badge/gates_de_seguridad-7%2F7-2d7d46)](https://github.com/higerotech/landing/actions/workflows/security-gates.yml)
[![Pruebas](https://img.shields.io/badge/pruebas-sin_suite-b30000)](.ai-dlc/gates/gate-3-testing.md)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-v0.3.0-333333)](CHANGELOG.md)

<!--
  Los tres badges son ESTÁTICOS a propósito, y hay que actualizarlos a mano.
  El repositorio es privado, y el proxy de imágenes de GitHub pide los badges sin
  autenticar: cualquier badge dinámico devuelve 404 y se renderiza roto. Comprobado
  contra los tres endpoints:
    - github.com/.../badge.svg            -> HTTP 404
    - shields.io/github/actions/workflow  -> "repo or workflow not found"
    - shields.io/github/v/tag             -> "repo not found"

  Cuando el repositorio pase a público, sustituir por los equivalentes dinámicos y
  borrar esta nota:
    [![CI](https://github.com/higerotech/landing/actions/workflows/security-gates.yml/badge.svg)](https://github.com/higerotech/landing/actions/workflows/security-gates.yml)
    [![Versión](https://img.shields.io/github/v/tag/higerotech/landing?label=versi%C3%B3n)](CHANGELOG.md)

  El badge de pruebas dice "sin suite" porque es la verdad: no hay ninguna prueba
  automatizada (Gate 3 abierto). Cambiarlo a "passing" exigiría antes que exista la
  suite, no reetiquetarlo.
-->

Landing page corporativa de **Higerotech**, consultora tecnológica AI-First para el B2B
venezolano. Sitio estático en modo oscuro, bilingüe (ES/EN), empaquetado para desplegar con
Docker sobre nginx.

Este repositorio sigue el estándar **AI-DLC** en su variante polyrepo (ver
[ADR-0001](docs/00-project/adr/0001-adopcion-estructura-ai-dlc-polyrepo.md)).

## Principio de diseño

El sitio vende arquitecturas resilientes que no dependen de enlaces frágiles. Debe
**comportarse** como aquello que vende:

- Sin dependencias de paquetes: ni npm, ni build step, ni `node_modules` ([ADR-0003](docs/00-project/adr/0003-sitio-de-un-solo-archivo-sin-build.md)).
- Sin recursos de terceros: todo same-origin, fuentes incluidas ([ADR-0004](docs/00-project/adr/0004-autoalojar-fuentes.md)).
- Legible sin JavaScript y sin webfonts ([ADR-0005](docs/00-project/adr/0005-degradacion-explicita-sin-js.md)).

No son optimizaciones opcionales: son requisitos, y hay ADRs que explican por qué.

## Estructura

```
.
├── index.html                  # Landing completa (HTML + CSS + JS en un archivo)
├── 404.html                    # Página de error con la identidad del sitio
├── robots.txt  sitemap.xml     # Indexación
├── assets/
│   ├── fonts/                  # Inter y Space Grotesk autoalojadas (SIL OFL 1.1)
│   ├── isotipo.svg             # Isotipo (3 hexágonos, nodo coral)
│   ├── og-card.png             # Tarjeta social 1200×630
│   └── logo_white_trans.png    # Logotipo
│
├── Dockerfile                  # nginx:1.30-alpine, valida la config en build
├── nginx.conf                  # Rutas, caché y códigos de estado
├── security-headers.conf       # Cabeceras — incluido en CADA location (ver ADR-0002)
├── docker-compose.yml          # Contenedor endurecido: read-only, cap_drop, límites
│
├── .ai-dlc/                    # La metodología aplicada a este repo
│   ├── gates/                  # Checklists Gate 0–5 con su estado real
│   ├── templates/              # Plantillas de ADR, PRD, threat model y runbook
│   └── owasp-mapping.md        # OWASP Top 10:2025 → controles, con lo que NO aplica
│
├── docs/
│   ├── 00-project/             # Charter, glosario, clasificación de datos, ADRs
│   ├── 01-requirements/        # PRD (Gate 0)
│   ├── 02-design/              # Arquitectura C4 y threat model (Gate 1)
│   ├── 03-implementation/      # Historial derivado de git
│   └── 05-deployment/          # Topología, pipeline, verificación y rollback
│
├── CHANGELOG.md  SECURITY.md  CONTRIBUTING.md
└── .github/workflows/          # Pipeline: 5 jobs, 7 comprobaciones G1–G7 (ver deployment.md)
```

> **Ojo con «los 7 gates»:** el pipeline implementa las siete comprobaciones **G1–G7** de
> [`deployment.md`](docs/05-deployment/deployment.md) §Pipeline (secretos, SAST, CVEs de
> imagen, SBOM, cabeceras, 404 y fuga de versión), y las siete están en verde. Eso **no** es
> lo mismo que los siete gates canónicos de AI-DLC que enumera
> [gate-4](.ai-dlc/gates/gate-4-deployment.md) —SAST, SCA, secrets, license, container, IaC,
> DAST—, de los cuales **license y DAST no existen**. Dos listas de siete, distintas.

## Estado de los gates

| Gate | Fase | Estado | Documento |
|---|---|---|---|
| 0 | Requisitos | ✅ Superado | [gate-0](.ai-dlc/gates/gate-0-requirements.md) |
| 1 | Diseño | ✅ Superado | [gate-1](.ai-dlc/gates/gate-1-design.md) |
| 2 | Implementación | ❌ Abierto — falta cobertura (no hay suite) | [gate-2](.ai-dlc/gates/gate-2-implementation.md) |
| 3 | Pruebas | ❌ Abierto — no hay suite | [gate-3](.ai-dlc/gates/gate-3-testing.md) |
| 4 | Despliegue | 🟡 Parcial — falta firma, digest y archivar el SBOM | [gate-4](.ai-dlc/gates/gate-4-deployment.md) |
| 5 | Monitoreo | ❌ Abierto — sin observabilidad | [gate-5](.ai-dlc/gates/gate-5-monitoring.md) |

Los gates abiertos lo están con su razón documentada. Ninguno se marca por conveniencia.

El CI ya está conectado y las siete comprobaciones pasan, así que el motivo por el que Gate 2
sigue abierto **cambió**: ya no es la falta de pipeline, es la falta de suite de pruebas, que
es el mismo bloqueo que Gate 3. Cerrarlo o no es decisión del owner, no de la herramienta.

## Desarrollo local (sin Docker)

Cualquier servidor estático sirve. Ojo: sin nginx **no hay cabeceras de seguridad ni 404
real**, así que no vale para verificar esos aspectos.

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Despliegue con Docker

```bash
docker compose up -d --build     # http://localhost:8080
docker compose down
```

`docker compose build` ejecuta `nginx -t` dentro de la imagen: una configuración inválida
rompe el build, no el arranque.

## Verificar antes de publicar

Los tres comandos que no deben saltarse:

```bash
# 1. Las cinco cabeceras de seguridad deben llegar a la home
curl -sI http://localhost:8080/ | grep -ci -E 'frame|nosniff|referrer|permissions|content-security'   # => 5

# 2. Y también a los assets (aquí es donde fallaba antes)
curl -sI http://localhost:8080/assets/fonts/fonts.css | grep -ci -E 'frame|nosniff|content-security'  # => 3

# 3. Una ruta inexistente debe devolver 404, no 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/no-existe                              # => 404
```

Y los diagramas de la documentación:

```bash
python "<ruta-skill-ai-dlc>/scripts/validate_mermaid.py" docs/
```

## Personalización

| Qué | Dónde |
|---|---|
| **Número de WhatsApp** | `CONTACT.whatsapp` en `index.html`. Vacío = el botón no se publica |
| Correo de contacto | `contacto@higerotech.com` en `index.html` (3 apariciones) |
| Idioma por defecto | `idiomaInicial()` — prioridad `?lang=` → `localStorage` → `es` |
| Colores y tipografía | Variables CSS en `:root` |
| Dominio | `canonical`, `hreflang`, Open Graph y JSON-LD en `<head>`, más `robots.txt` y `sitemap.xml` |
| Política de cabeceras | `security-headers.conf` — un solo archivo para todas las rutas |

**Al editar textos:** cada cadena visible necesita `data-es` **y** `data-en`, y el texto
visible debe coincidir con `data-es`. Si editas uno y no el otro, el cambio desaparece al
cargar la página — `setLang()` corre al arrancar. Ver
[CONTRIBUTING.md](CONTRIBUTING.md).

## Notas técnicas

- **Imagen base:** `nginx:1.30-alpine`. Pendiente anclar por digest.
- **Peso:** ~80 KB de HTML + ~70 KB de fuentes que el visitante ES/EN llega a descargar.
- **Caché:** assets 30 días con `immutable`; el HTML siempre se revalida.
- **Contenedor:** rootfs de solo lectura, `cap_drop: ALL`, `no-new-privileges`,
  0,5 CPU / 128 MB.
- **Fuentes:** variables, un archivo por familia y subset. `unicode-range` evita descargar
  `latin-ext` a quien no lo necesita.

## Pendiente

Ver [`CHANGELOG.md`](CHANGELOG.md) §Unreleased. En resumen: confirmar dominio, configurar el
número de WhatsApp, montar la suite de pruebas (Gate 3), montar un monitor externo de
disponibilidad y diagnosticar el contenedor de producción en estado `unhealthy`.

El pipeline **ya está conectado** y sus siete comprobaciones pasan. Lo que no existe es una
barrera que lo haga obligatorio: la org está en plan Free y el repo es privado, combinación en
la que GitHub no ofrece branch protection ni rulesets, así que un pipeline en rojo **no impide
mergear**. La única barrera es `.githooks/pre-push`, que es local y no consulta el CI. Ver
[CONTRIBUTING.md](CONTRIBUTING.md) §Al clonar.
