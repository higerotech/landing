# Contribuir

## Flujo: Red-Green-Refactor-Secure

En un sitio estático el ciclo se adapta, pero el orden se mantiene:

1. **Red** — reproduce el problema. Si es visual, con una captura o un ancho de viewport
   concreto; si es de cabeceras, con el `curl -sI` que lo demuestra.
2. **Green** — el cambio mínimo que lo corrige.
3. **Refactor** — que el resultado se lea como el resto del archivo. `index.html` tiene un
   estilo propio (tokens CSS en `:root`, comentarios con guiones largos): respétalo.
4. **Secure** — revisa si el cambio toca alguno de los controles de
   [`.ai-dlc/owasp-mapping.md`](.ai-dlc/owasp-mapping.md). Si añades un recurso externo,
   la CSP tiene que cambiar y eso es una ADR.

## Al clonar

```bash
git config core.hooksPath .githooks
```

Activa `.githooks/pre-push`, que rechaza los pushes directos a `main`. Hace falta porque
la org está en plan Free y el repo es privado: en esa combinación GitHub no ofrece branch
protection ni rulesets, así que la regla la impone el clon y no el servidor. Es una red de
seguridad contra el despiste, no un control: `--no-verify`, otra máquina o un merge desde
la web se la saltan. `core.hooksPath` es configuración local, así que cada clon nuevo
necesita el comando otra vez.

## Antes de abrir una PR

```bash
# La configuración de nginx debe ser válida
docker compose build

# El sitio debe levantar y responder con las cabeceras completas
docker compose up -d
curl -sI http://localhost/ | grep -i -E 'frame|nosniff|referrer|permissions|content-security'

# Una ruta inexistente debe devolver 404, no 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/no-existe   # => 404

# Los diagramas de la documentación deben renderizar
python "<ruta-del-skill>/scripts/validate_mermaid.py" docs/
```

## Reglas que no se saltan

- **Nada de recursos de terceros.** Ni fuentes, ni scripts, ni iconos desde un CDN. Todo
  same-origin. Es lo que permite mantener la CSP cerrada y es coherente con lo que el sitio
  vende (ADR-0004).
- **Sin dependencias de paquetes.** Ni npm ni build step. Si crees que hace falta, es una
  ADR, no un `package.json` (ADR-0003).
- **Texto bilingüe completo.** Cada cadena visible necesita `data-es` **y** `data-en`, y el
  texto visible del HTML debe coincidir con `data-es`. Si editas uno y no el otro, el cambio
  desaparece en cuanto se carga la página: `setLang()` corre al arrancar.
- **Nada que rompa sin JS.** El contenido debe seguir siendo legible con JavaScript
  deshabilitado.
- **Gates.** Una PR no se mergea si no cierra el gate de su fase
  ([`.ai-dlc/gates/`](.ai-dlc/gates/)).

## Documentación

Los diagramas van **inline** como bloques ```mermaid dentro del documento de su fase, no en
una carpeta aparte. Si tocas la arquitectura, actualiza el C4 correspondiente en el mismo
commit.

`docs/03-implementation/repo-history.md` **no se edita a mano**: se regenera tras cada merge o
tag con `gitgraph_from_log.py`, que vive **en el skill de AI-DLC**, no en este repositorio —
igual que `validate_mermaid.py`:

```bash
python "<ruta-skill-ai-dlc>/scripts/gitgraph_from_log.py" . --branch main \
  --out docs/03-implementation/_derivado.md
```

## Commits

Convención: `tipo(scope): mensaje` — `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `sec`.

Al cerrar un gate, corta `[Unreleased]` a una versión en `CHANGELOG.md` (Gate 0 → 0.1.0,
Gate 1 → 0.2.0, …) y sincroniza el campo `Versión` de los artefactos aprobados.

## Dual review

Toda PR requiere revisión humana + análisis asistido por IA. El autor no aprueba su propia PR.
