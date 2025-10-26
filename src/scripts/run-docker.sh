# pick a single Postgres tag and keep it pinned
docker pull postgres:15-alpine

# network (idempotent)
docker network create localnet || true

# DB: use a named volume; add a health-check
docker rm -f psql-db 2>/dev/null || true
docker volume create sportbooking_pgdata >/dev/null
docker run -d --name psql-db \
  --network localnet \
  -e POSTGRES_USER=psql_admin \
  -e POSTGRES_PASSWORD=SOME_PASSWORD \
  -e POSTGRES_DB=SportBooking \
  -p 5432:5432 \
  --restart unless-stopped \
  --health-cmd="pg_isready -U psql_admin -d SportBooking || exit 1" \
  --health-interval=5s --health-timeout=5s --health-retries=20 \
  -v sportbooking_pgdata:/var/lib/postgresql/data \
  postgres:15-alpine

# wait for DB to be healthy (status becomes "healthy")
until [ "$(docker inspect -f '{{json .State.Health.Status}}' psql-db)" = "\"healthy\"" ]; do
  echo "Waiting for DB..."; sleep 2;
done
echo "DB ready."

# API build + run (your Dockerfile will run migrations at startup)
npm run docker:build-image
docker rm -f api-server 2>/dev/null || true
docker run -d --name api-server \
  --network localnet \
  -p 3030:3030 \
  --env-file .env.docker \
  --restart unless-stopped \
  rismun/sportbooking/api-server:latest
