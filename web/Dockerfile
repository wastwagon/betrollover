# BetRollover Web - Development Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

EXPOSE 3000

# Development with hot reload
CMD ["npm", "run", "dev"]
