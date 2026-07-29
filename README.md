# Higerotech — Landing Page

Landing page corporativa de **Higerotech**, consultora tecnológica AI-First para el B2B venezolano. Sitio estático en modo oscuro, bilingüe (ES/EN), empaquetado para desplegar con Docker sobre nginx.

## Estructura

```
.
├── index.html            # Landing (HTML + CSS + JS en un solo archivo)
├── assets/               # Logo, isotipo y recursos gráficos
│   ├── isotipo.svg       # Isotipo vectorial (3 hexágonos, nodo coral)
│   ├── logo_white_trans.png
│   └── ...
├── Dockerfile            # Imagen nginx:alpine con el sitio estático
├── nginx.conf            # gzip, caché de assets y headers de seguridad
├── docker-compose.yml    # Orquestación local
└── .dockerignore
```

## Desarrollo local (sin Docker)

Cualquier servidor estático sirve. Por ejemplo:

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

## Despliegue con Docker

### Opción A — docker compose (recomendada)

```bash
docker compose up -d --build
```

El sitio queda disponible en **http://localhost:8080**.

Para detenerlo:

```bash
docker compose down
```

### Opción B — docker a mano

```bash
# construir la imagen
docker build -t higerotech/landing:latest .

# ejecutar el contenedor
docker run -d --name higerotech-landing -p 8080:80 higerotech/landing:latest
```

## Publicar la imagen en un registro

```bash
docker tag higerotech/landing:latest <tu-registro>/higerotech-landing:latest
docker push <tu-registro>/higerotech-landing:latest
```

Sirve igual para Docker Hub, GitHub Container Registry, AWS ECR o cualquier
plataforma compatible (Render, Railway, Fly.io, Cloud Run, etc.).

## Notas técnicas

- **Imagen base:** `nginx:1.27-alpine` (~50 MB, sin dependencias extra).
- **Puerto interno:** 80 — mapeado a 8080 en el host (ajústalo en `docker-compose.yml`).
- **Healthcheck:** verificación HTTP contra `/` cada 30 s.
- **Caché:** los assets se cachean 30 días; el `index.html` siempre se revalida.
- **Seguridad:** headers `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy` y `Permissions-Policy` aplicados en `nginx.conf`.

## Personalización rápida

- **Contacto:** cambia `contacto@higerotech.com` y el enlace de WhatsApp
  (`https://wa.me/`) en `index.html`.
- **Idioma por defecto:** función `setLang('es')` al final de `index.html`.
- **Colores de marca:** variables CSS en `:root` dentro de `index.html`.
