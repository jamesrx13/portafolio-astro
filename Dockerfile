# Etapa 1: build de Astro (páginas estáticas + servidor Node)
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: servidor Node. Dokploy publica el puerto 80.
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80

EXPOSE 80

CMD ["node", "./dist/server/entry.mjs"]
