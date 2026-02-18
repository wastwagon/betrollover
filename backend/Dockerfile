# BetRollover API - Development Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build with tsc (remove incremental cache so we get full emit)
RUN rm -f tsconfig.build.tsbuildinfo && npx tsc -p tsconfig.build.json

# Expose port
EXPOSE 3001

# Run compiled output
CMD ["node", "dist/main.js"]
