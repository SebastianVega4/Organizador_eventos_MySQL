# Usar una imagen base de Node.js LTS (Long Term Support)
FROM node:18-alpine

# Definir el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo las de desarrollo)
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto en el que corre la aplicación
EXPOSE 5000

# El comando para iniciar la aplicación se define en docker-compose.yml