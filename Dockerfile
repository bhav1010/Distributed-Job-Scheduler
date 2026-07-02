FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Python and build tools are required to build better-sqlite3 from source in alpine
RUN apk add --no-cache python3 make g++ && \
    npm install && \
    apk del python3 make g++

COPY . .

EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["node", "server.js"]
