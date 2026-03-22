FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our HTML app and nginx template
COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default values — Railway overrides PORT and BACKEND_URL at runtime via Variables tab
ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

# EXPOSE must be a single hardcoded number — Railway reads this at build time
EXPOSE 80

# envsubst injects $PORT and $BACKEND_URL into the nginx config, then starts nginx
CMD ["/bin/sh", "-c", \
  "envsubst '$PORT $BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
