# ── Stage 1 : Build Vite ────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

# Variables Vite injectées au build (ARG → ENV → vite build)
ARG VITE_API_URL=http://localhost:8080/medinalink/api/v1
ARG VITE_WS_URL=ws://localhost:8080/medinalink
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY . .
RUN npm run build

# ── Stage 2 : Nginx ──────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
