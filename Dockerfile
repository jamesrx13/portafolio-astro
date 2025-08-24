# Etapa 1: Construcción
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente
COPY . .

# Generar la build estática
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Borrar archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar los archivos estáticos de Astro
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
