# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code and build the application
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our HTML app and nginx template from build stage
# Vite build output is in 'dist' folder by default
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default values — Railway overrides PORT and BACKEND_URL at runtime via Variables tab
ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

# EXPOSE must be a single hardcoded number — Railway reads this at build time
EXPOSE 80

# envsubst injects $PORT and $BACKEND_URL into the nginx config, then starts nginx
CMD ["/bin/sh", "-c", \
  "envsubst '$PORT $BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
