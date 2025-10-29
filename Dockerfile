# ---------- Build stage ----------
FROM node:20-alpine AS builder
ENV NODE_ENV=build
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Work as non-root
WORKDIR /home/node
USER node

# Copy manifest + lockfile first for better layer caching
# IMPORTANT: you MUST have package-lock.json in your repo for npm ci to work.
COPY --chown=node:node package.json package-lock.json ./

# Install deps (deterministic)
RUN npm ci

# Copy the full source
COPY --chown=node:node . .

# Build the app (Nest -> dist/) and remove dev deps
RUN npm run build && npm prune --production


# ---------- Runtime stage ----------
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3030
ENV UPLOAD_DIR=uploads
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Install OS-level deps as root BEFORE dropping privileges
RUN apk add --no-cache tzdata libc6-compat

# Now drop to non-root for security
WORKDIR /home/node
USER node

# Copy only what's needed to run
COPY --from=builder --chown=node:node /home/node/package.json ./package.json
COPY --from=builder --chown=node:node /home/node/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/dist ./dist
COPY --from=builder --chown=node:node /home/node/db ./db

# Ensure uploads dir exists and is writable (will also get a volume in compose)
RUN mkdir -p /home/node/${UPLOAD_DIR}

EXPOSE 3030

# Run migrations then boot the service
CMD ["sh", "-c", "node dist/scripts/run-sql-migrations.js && node dist/main.js"]
