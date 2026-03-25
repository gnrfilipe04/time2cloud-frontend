# Etapa 1: build do React
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Etapa 2: servir arquivos estáticos com Caddy
FROM caddy:2-alpine

COPY --from=builder /usr/src/app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80