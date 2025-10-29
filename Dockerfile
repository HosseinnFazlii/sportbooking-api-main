# ---------- Build stage ----------
FROM node:20 AS builder
ENV NODE_ENV=build
WORKDIR /home/node

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm prune --production

# ---------- Runtime stage ----------
FROM node:20-slim
ENV NODE_ENV=production
ENV PORT=3030
ENV UPLOAD_DIR=uploads

WORKDIR /home/node
USER node

COPY --from=builder --chown=node:node /home/node/package.json ./package.json
COPY --from=builder --chown=node:node /home/node/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/dist ./dist
COPY --from=builder --chown=node:node /home/node/db ./db

RUN mkdir -p /home/node/${UPLOAD_DIR}

EXPOSE 3030
CMD ["sh", "-c", "node dist/scripts/run-sql-migrations.js && node dist/main.js"]
