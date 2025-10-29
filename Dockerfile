# ---------- Build stage ----------
FROM node:20-alpine AS builder
ENV NODE_ENV=build
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# work dir
WORKDIR /home/node

# we'll install as non-root for safety after deps install
# (apk is not needed in builder stage so it's fine)
# Copy package manifest(s)
COPY package*.json ./

# Install deps (no lockfile, so can't use npm ci)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build NestJS -> dist/ and remove dev deps
RUN npm run build && npm prune --production


# ---------- Runtime stage ----------
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3030
ENV UPLOAD_DIR=uploads
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# install OS deps as root BEFORE dropping privileges
RUN apk add --no-cache tzdata libc6-compat

WORKDIR /home/node

# now drop privs
USER node

# Copy only what we need to run
COPY --from=builder --chown=node:node /home/node/package.json ./package.json
COPY --from=builder --chown=node:node /home/node/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/dist ./dist
COPY --from=builder --chown=node:node /home/node/db ./db

# ensure uploads dir exists (also volume mounted in compose)
RUN mkdir -p /home/node/${UPLOAD_DIR}

EXPOSE 3030

CMD ["sh", "-c", "node dist/scripts/run-sql-migrations.js && node dist/main.js"]
