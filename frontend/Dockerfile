# Usamos la misma base que el backend para consistencia
FROM node:18-alpine

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# CORREGIDO: El puerto por defecto de Create React App es 3000
EXPOSE 3000

# CORREGIDO: El script de inicio de Create React App es "npm start"
CMD ["npm", "start"]