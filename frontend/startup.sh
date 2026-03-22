#!/bin/sh
set -e

# Step 1: Replace NGINX_PORT placeholder in nginx config
sed -i "s|NGINX_PORT|${PORT:-80}|g" /etc/nginx/conf.d/default.conf

# Step 2: Replace QUANTEDGE_API_URL placeholder in index.html
# Using awk with -v to pass the URL - this safely handles / : . in the URL
awk -v apiurl="${BACKEND_URL}" \
    '{gsub("QUANTEDGE_API_URL", apiurl); print}' \
    /usr/share/nginx/html/index.html \
    > /tmp/index_updated.html \
    && mv /tmp/index_updated.html /usr/share/nginx/html/index.html

echo "Config done: PORT=${PORT:-80}, BACKEND_URL=${BACKEND_URL}"

# Step 3: Start nginx
exec nginx -g "daemon off;"
