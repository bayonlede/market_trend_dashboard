FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

EXPOSE 80

# Use sed to replace plain-text placeholders with actual env var values.
# This avoids the envsubst $ quoting problem entirely.
CMD sed -i "s|NGINX_PORT|${PORT}|g; s|NGINX_BACKEND|${BACKEND_URL}|g" \
    /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"
