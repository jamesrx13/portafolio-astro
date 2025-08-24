# Etapa 1: Build de Astro
FROM node:18-alpine AS build

WORKDIR /app

# Copiamos dependencias primero
COPY package*.json ./
RUN npm install

# Copiamos el resto del proyecto
COPY . .

# Generamos la build estática
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:alpine

# Borramos archivos default de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiamos SOLO la carpeta dist generada por Astro
COPY --from=build /app/dist /usr/share/nginx/html

# Exponemos el puerto
EXPOSE 80

# Iniciamos Nginx
CMD ["nginx", "-g", "daemon off;"]
