# Etapa 1: build do React
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Se o compose não passar VITE_API_URL (string vazia), não exportamos a variável para o Vite
# usar o valor de .env.production do repositório.
ARG VITE_API_URL=
RUN if [ -n "$VITE_API_URL" ]; then export VITE_API_URL="$VITE_API_URL"; fi && npm run build

# Etapa 2: servir arquivos estáticos com Caddy
FROM caddy:2-alpine

COPY --from=builder /usr/src/app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 4000