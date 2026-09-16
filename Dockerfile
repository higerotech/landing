# ── Higerotech landing — imagen estática con nginx ──────────────
FROM nginx:1.30-alpine

LABEL org.opencontainers.image.title="Higerotech Landing" \
      org.opencontainers.image.description="Landing page AI-First de Higerotech" \
      org.opencontainers.image.vendor="Higerotech" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.source="https://github.com/higerotech/landing"

# Config de nginx. El snippet de cabeceras va aparte porque cada `location`
# tiene que incluirlo: `add_header` no se hereda si el nivel define el suyo.
COPY nginx.conf              /etc/nginx/conf.d/default.conf
COPY security-headers.conf   /etc/nginx/snippets/security-headers.conf

# Sitio estático
COPY index.html   /usr/share/nginx/html/index.html
COPY 404.html     /usr/share/nginx/html/404.html
COPY robots.txt   /usr/share/nginx/html/robots.txt
COPY sitemap.xml  /usr/share/nginx/html/sitemap.xml
COPY assets/      /usr/share/nginx/html/assets/

# Páginas legales, un archivo por idioma. La versión castellana es la que
# produce efectos; la inglesa es traducción de cortesía. U12.3 comprueba que
# esta lista y `PUBLICABLES` de scripts/preparar-assets.mjs no divergan.
COPY privacidad.html     /usr/share/nginx/html/privacidad.html
COPY privacy.html        /usr/share/nginx/html/privacy.html
COPY terminos.html       /usr/share/nginx/html/terminos.html
COPY terms.html          /usr/share/nginx/html/terms.html
COPY cookies.html        /usr/share/nginx/html/cookies.html
COPY cookie-notice.html  /usr/share/nginx/html/cookie-notice.html
COPY ia-responsable.html /usr/share/nginx/html/ia-responsable.html
COPY responsible-ai.html /usr/share/nginx/html/responsible-ai.html

# Falla el build si la configuración no es válida, en vez de descubrirlo al arrancar.
RUN nginx -t

EXPOSE 80

# Healthcheck contra la raíz. Va a 127.0.0.1 y no a `localhost`: el /etc/hosts de
# la imagen resuelve ese nombre también a `::1`, el wget de busybox intenta IPv6
# primero y nginx solo escucha en IPv4 (`listen 80`). Por nombre el chequeo
# devuelve «connection refused» siempre, aunque el sitio funcione.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
