FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

EXPOSE 80

# Two sed operations:
# 1. Replace NGINX_PORT placeholder in nginx.conf with the actual port
# 2. Inject BACKEND_URL directly into index.html so the browser calls the API directly
CMD sed -i "s|NGINX_PORT|${PORT}|g" /etc/nginx/conf.d/default.conf && \
    sed -i "s|window.BACKEND_URL || ''|'${BACKEND_URL}'|g" /usr/share/nginx/html/index.html && \
    nginx -g "daemon off;"
