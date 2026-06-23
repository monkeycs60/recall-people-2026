#!/usr/bin/env bash
# Postgres de DEV LOCAL (Docker) pour Recall People + application du schéma Prisma.
# Même méthodo que coworker-malin (DB de dev = conteneur Docker local, JAMAIS Neon ni le VPS).
# À lancer avant le backend en dev. Idempotent : réutilise le conteneur s'il existe.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

DEV_CONTAINER="${DEV_CONTAINER:-recall-pg}"
DEV_POSTGRES_PASSWORD="${DEV_POSTGRES_PASSWORD:-dev}"
DEV_POSTGRES_DB="${DEV_POSTGRES_DB:-recall}"
DEV_POSTGRES_PORT="${DEV_POSTGRES_PORT:-5434}"      # 5433 est pris par coworker-malin (cm-pg)
DEV_POSTGRES_IMAGE="${DEV_POSTGRES_IMAGE:-postgres:16}"
DEV_DATABASE_URL="${DEV_DATABASE_URL:-postgres://postgres:dev@localhost:5434/recall}"
WAIT="${DEV_POSTGRES_WAIT_SECONDS:-30}"

command -v docker >/dev/null 2>&1 || { echo "!! Docker requis pour la base de dev locale." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "!! Docker ne répond pas. Lance Docker puis relance." >&2; exit 1; }

if docker ps --format '{{.Names}}' | grep -qx "$DEV_CONTAINER"; then
  echo "==> Conteneur de dev '$DEV_CONTAINER' déjà lancé."
elif docker ps -a --format '{{.Names}}' | grep -qx "$DEV_CONTAINER"; then
  echo "==> Démarrage de '$DEV_CONTAINER'..."
  docker start "$DEV_CONTAINER" >/dev/null
else
  echo "==> Création de '$DEV_CONTAINER' (postgres local)..."
  docker run -d --name "$DEV_CONTAINER" \
    -e POSTGRES_PASSWORD="$DEV_POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$DEV_POSTGRES_DB" \
    -p "$DEV_POSTGRES_PORT:5432" \
    "$DEV_POSTGRES_IMAGE" >/dev/null
fi

echo "==> Attente de la base de dev..."
ok=0
for ((i = 1; i <= WAIT; i++)); do
  if docker exec "$DEV_CONTAINER" pg_isready -U postgres -d "$DEV_POSTGRES_DB" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
[ "$ok" = 1 ] || { echo "!! Postgres dev pas prêt après ${WAIT}s (docker logs $DEV_CONTAINER)" >&2; exit 1; }

echo "==> Synchronisation du schéma Prisma (db push)..."
# db push (et pas migrate deploy) : les migrations recall sont incomplètes (pas de
# migration initiale). schema.prisma est la source de vérité → on pousse tout le schéma.
( cd "$BACKEND_DIR" && DATABASE_URL="$DEV_DATABASE_URL" npx prisma db push --skip-generate --accept-data-loss )

echo "==> Postgres dev Recall prêt → $DEV_DATABASE_URL"
