# PRODUCTION DOCKERFILE
# ---------------------
# This Dockerfile allows to build a Docker image of the NestJS application
# and based on a NodeJS 16 image. The multi-stage mechanism allows to build
# the application in a "builder" stage and then create a lightweight production
# image containing the required dependencies and the JS build files.
# 
# COMMANDS:
# docker pull postgres:13.22-trixie
# docker network create localnet || true
# DB
# docker run --name psql-db -e POSTGRES_USER=psql_admin -e POSTGRES_PASSWORD=Yc5cvHKqN8Uoa7U -e POSTGRES_DB=SportBooking -d -p 5432:5432 -v ~/postgres-data:/var/lib/postgresql/data postgres:latest
# build + run API
# npm run docker:build
# npm run docker:run

# ---------- Build stage ----------
FROM node:20-alpine AS builder
ENV NODE_ENV=build

# optional: improve sharp compatibility
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Work as non-root
USER node
WORKDIR /home/node

# Install deps
COPY package*.json ./
RUN npm ci

# Copy sources
COPY --chown=node:node . .

# Build and prune
RUN npm run build && npm prune --production

# ---------- Runtime stage ----------
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3030
ENV UPLOAD_DIR=uploads
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
# tzdata for proper time zone handling
RUN apk add --no-cache tzdata libc6-compat

USER node
WORKDIR /home/node

# Copy runtime artifacts
COPY --from=builder --chown=node:node /home/node/package*.json ./
COPY --from=builder --chown=node:node /home/node/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/dist ./dist
# Make raw SQL migrations available in the container
COPY --chown=node:node db ./db

# Optional: create upload dir
RUN mkdir -p /home/node/${UPLOAD_DIR}

EXPOSE 3030

# Run migrations then start the app
CMD ["sh", "-c", "node dist/scripts/run-sql-migrations.js && node dist/main.js"]
