# Etapa 1: Construcción de Astro
FROM node:18-alpine AS build

WORKDIR /app

# Copiar dependencias primero (para aprovechar cache)
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Construir el proyecto (genera carpeta /app/dist)
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Limpiar contenido por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar solo la carpeta dist (NO el código fuente)
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
