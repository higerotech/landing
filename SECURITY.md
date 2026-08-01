# Política de Seguridad

## Reporte de vulnerabilidades

Contacto: **contacto@higerotech.com**. No abrir issues públicos para fallos de seguridad.

Compromiso de respuesta: acuse en 72 h hábiles. `<TODO: confirmar si se habilita
security@higerotech.com como buzón dedicado>`

## Alcance

Este repositorio publica una **landing page estática**. No procesa datos de usuario, no
tiene backend, base de datos, autenticación ni formularios. La superficie de ataque real
se concentra en cuatro puntos:

1. **Configuración de lo que sirve** — cabeceras, CSP y exposición de rutas, hoy en **dos**
   sitios: `cloudflare/_headers` (Worker, camino canónico) y `nginx.conf` +
   `security-headers.conf` (contenedor, contingencia). Que las dos definiciones no diverjan lo
   vigila la prueba **U12**; sin ella, la duplicación sería el agujero.
2. **Cadena de suministro** — la imagen base `nginx:1.30-alpine` y las dependencias de
   desarrollo del repositorio.
3. **Integridad del contenido servido** — que lo publicado sea lo revisado. Lo comprueba
   `scripts/verificar-zona.mjs` comparando byte a byte lo servido contra el artefacto del build.
   El mismo script vigila una excepción deliberada: **tres imágenes de marca** —isotipo en
   carbón, tarjeta social y logotipo— se sirven con `Cross-Origin-Resource-Policy: cross-origin`
   para poder incrustarse desde fuera —solo eso: **no** llevan `Access-Control-Allow-Origin`, que permitiría además leerlas con `fetch()`—. El resto del sitio sigue en `same-origin`, y hay control
   negativo: **E10** comprueba que un asset cerrado siga bloqueado desde un tercero, no solo que
   los abiertos carguen. Son imágenes públicas de marca; no hay nada detrás de ese origen que
   proteger.
4. **El token de despliegue del CI** — una credencial que puede publicar en el dominio
   canónico. Alcance mínimo (`Workers Scripts: Edit`, sin permiso sobre DNS) y rotable. Es la
   amenaza **T18** del threat model.

El detalle por riesgo OWASP está en [`.ai-dlc/owasp-mapping.md`](.ai-dlc/owasp-mapping.md)
y el análisis STRIDE en [`docs/02-design/threat-model.md`](docs/02-design/threat-model.md).

## Fuera de alcance

- La terminación TLS vive fuera de este repositorio: la hace Cloudflare. Lo que **sí** está
  aquí desde el 2026-07-31 es la configuración del Worker (`wrangler.jsonc`,
  `cloudflare/_headers`), así que las cabeceras del camino canónico ya son revisables en un PR.
- El correo `contacto@higerotech.com` publicado en la página es información comercial
  deliberadamente pública; su recolección por scrapers es un coste asumido, no un incidente.

## Gestión de secretos

**El código no contiene secretos.** No hay claves de API, credenciales ni tokens en el árbol
de archivos; `.gitignore` excluye `.env*` de forma preventiva. Verificado por herramienta, no
solo por lectura: gitleaks corre en cada PR y el historial completo se escaneó aparte con el
binario (9 commits, sin hallazgos).

**El CI sí requiere un secreto.** `GITLEAKS_LICENSE` vive como *Actions secret* del
repositorio, porque `gitleaks-action` exige licencia en repos de organización. No está en el
árbol ni debe estarlo; se gestiona con `gh secret set` y GitHub no devuelve su valor. Al
rotarlo, basta reescribirlo: no hay copia en el repositorio que actualizar.

Si en el futuro se añade algo que requiera más secretos (formulario de contacto, analítica),
deben gestionarse igual: fuera del árbol, como secretos de Actions o del entorno de despliegue.
El gate de detección de secretos **ya existe** y cubre lo que entra por PR.

## Supply chain (A03)

- **El sitio que se publica no tiene ninguna dependencia**: ni `npm`, ni CDNs, ni nada que se
  descargue en tiempo de ejecución. Es una propiedad deliberada de la arquitectura (ADR-0003) y
  sigue intacta — `index.html` es autocontenido.
- Cuando una dependencia transitiva queda anclada a una versión vulnerable por un **pin exacto**
  de su padre, se fuerza con `overrides` en `package.json` en vez de esperar al upstream. Ocurrió
  con `qs`: `typed-rest-client` lo declara como `6.15.1` exacto, así que `npm audit fix` no tenía
  margen para subir y el aviso habría quedado abierto indefinidamente.
- El **repositorio** sí tiene dependencias desde que existen las pruebas y el despliegue
  (Playwright, jsdom, Stryker, Lighthouse, `wrangler`), todas de desarrollo y ancladas en
  `package-lock.json`. Ninguna llega al visitante, pero **sí forman parte de la superficie de
  la cadena de suministro** y por eso el gate SCA las cubre. Decir «cero dependencias» a secas
  dejaría de ser cierto.
- Fuentes tipográficas **autoalojadas** (ADR-0004): no se carga nada desde CDNs de terceros.
- Imagen base anclada a `nginx:1.30-alpine`, escaneada con Trivy en cada PR (0 CVEs
  corregibles de severidad HIGH o CRITICAL).
- SBOM CycloneDX generado en cada run del pipeline.
- `aquasecurity/trivy-action` anclado por SHA de commit, no por tag ni por rama.
  Pendiente: anclar la imagen por digest `sha256`, archivar el SBOM por release, firmar la
  imagen, y anclar por SHA también `gitleaks-action` y `semgrep-action`. Ver
  [`.ai-dlc/gates/gate-4-deployment.md`](.ai-dlc/gates/gate-4-deployment.md).

## Cabeceras de seguridad

Definidas en [`security-headers.conf`](security-headers.conf) e incluidas en **cada** bloque
`location` de nginx. Esto no es redundancia: `add_header` solo se hereda del nivel superior
si el nivel actual no declara ninguna propia (ver ADR-0002).

Verificación:

```bash
curl -sI https://higerotech.com/ | grep -i -E 'frame|nosniff|referrer|permissions|content-security'
```

## Brechas conocidas y aceptadas

| Brecha | Riesgo | Estado |
|---|---|---|
| CSP con `'unsafe-inline'` | Medio | Aceptado — CSS/JS inline por diseño (ADR-0003) |
| Sin alertas de disponibilidad | Medio | **Abierto** — Gate 5 no superado |
| SBOM sin archivar por release y sin firma de imagen | Bajo | **Abierto** — Gate 4. El SBOM se genera, pero caduca con el artefacto del run |
| Sin pruebas automatizadas | Medio | **Abierto** — Gate 3 |
| Los gates de seguridad no bloquean el merge | **Alto** | ✅ **Cerrado el 2026-07-31.** Al hacerse público el repositorio dejó de aplicar la limitación del plan Free, y `main` quedó protegido: pull request obligatoria, los **siete** checks en verde y actualizados respecto a `main`, sin force-push, sin borrado y **con los administradores incluidos**. Cero aprobaciones requeridas, para no bloquear a un mantenedor único. Verificado por API |
