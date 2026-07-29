# ── Higerotech landing — imagen estática con nginx ──────────────
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Higerotech Landing" \
      org.opencontainers.image.description="Landing page AI-First de Higerotech" \
      org.opencontainers.image.vendor="Higerotech"

# Config de nginx (gzip, caché, headers de seguridad)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Sitio estático
COPY index.html /usr/share/nginx/html/index.html
COPY assets/    /usr/share/nginx/html/assets/

EXPOSE 80

# Healthcheck simple contra la raíz
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
