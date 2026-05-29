FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiamos primero el package.json para aprovechar el cacheo de capas de Docker
COPY package*.json ./

# Instalamos solo las dependencias de producción (más ligero)
RUN npm ci --only=production

# Copiamos el resto de los archivos (server.js, public/)
COPY . .

# Exponemos el puerto
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["node", "server.js"]
