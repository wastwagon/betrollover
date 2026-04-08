# BetRollover API - Development Dockerfile
# Build context must be the repo root: docker build -f backend/Dockerfile .
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY packages/shared-types/package.json packages/shared-types/package-lock.json packages/shared-types/tsconfig.json /packages/shared-types/
COPY packages/shared-types/src /packages/shared-types/src
RUN cd /packages/shared-types && npm ci && npm run build

COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./

RUN rm -f tsconfig.build.tsbuildinfo && npx tsc -p tsconfig.build.json

EXPOSE 3001
CMD ["node", "dist/main.js"]
