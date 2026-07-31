# Política de Seguridad

## Reporte de vulnerabilidades

Contacto: **contacto@higerotech.com**. No abrir issues públicos para fallos de seguridad.

Compromiso de respuesta: acuse en 72 h hábiles. `<TODO: confirmar si se habilita
security@higerotech.com como buzón dedicado>`

## Alcance

Este repositorio publica una **landing page estática**. No procesa datos de usuario, no
tiene backend, base de datos, autenticación ni formularios. La superficie de ataque real
se concentra en tres puntos:

1. **Configuración de nginx** — cabeceras, CSP, exposición de rutas.
2. **Cadena de suministro de la imagen** — la base `nginx:1.30-alpine`.
3. **Integridad del contenido servido** — que lo publicado sea lo revisado.

El detalle por riesgo OWASP está en [`.ai-dlc/owasp-mapping.md`](.ai-dlc/owasp-mapping.md)
y el análisis STRIDE en [`docs/02-design/threat-model.md`](docs/02-design/threat-model.md).

## Fuera de alcance

- La terminación TLS y el borde (túnel/proxy) viven fuera de este repositorio.
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

- Cero dependencias de gestores de paquetes: sin `npm`, sin `pip`, sin lockfiles.
  Es una propiedad deliberada de la arquitectura (ver ADR-0003).
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
