# ── Stage 1: Build React app ────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# VITE_API_URL is injected by Railway at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ───────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Template config: Railway will inject $PORT at runtime
COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV PORT=80
EXPOSE $PORT

# Standard Nginx Alpine entrypoint already handles envsubst for files in /etc/nginx/templates/
# We simplify the CMD to ensure it starts correctly and binds to $PORT
CMD ["nginx", "-g", "daemon off;"]
