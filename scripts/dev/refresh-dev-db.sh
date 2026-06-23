#!/usr/bin/env bash
# Rafraîchit la base de DEV locale (recall-pg) avec une copie FRAÎCHE de la PROD.
#
# Sens unique : prod -> dev. Côté prod = LECTURE SEULE (pg_dump), la prod n'est
# JAMAIS modifiée. La base de dev locale est écrasée (le dump fait --clean).
# Tu peux donc tout casser en dev sans aucun risque pour la prod.
#
# Usage : npm run db:refresh-dev   (ou ./scripts/dev/refresh-dev-db.sh)
set -euo pipefail

VPS="${VPS:-ubuntu@vps-139a77b3.vps.ovh.net}"
PG_CONTAINER="${PG_CONTAINER:-lcf994khltobasngvi6e54o6}"   # Postgres de PROD (Coolify, VPS)
PROD_DB="${PROD_DB:-recall}"                                # base prod recall dans ce conteneur
DEV_CONTAINER="${DEV_CONTAINER:-recall-pg}"                 # Postgres de DEV (docker local)
DEV_URL="${DEV_DATABASE_URL:-postgres://postgres:dev@localhost:5434/recall}"

# 1) S'assurer que la dev locale tourne.
if ! docker ps --format '{{.Names}}' | grep -qx "$DEV_CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$DEV_CONTAINER"; then
    echo "==> Démarrage du conteneur de dev '$DEV_CONTAINER'..."
    docker start "$DEV_CONTAINER" >/dev/null
  else
    echo "!! Conteneur de dev '$DEV_CONTAINER' introuvable. Lance d'abord scripts/dev/ensure-dev-postgres.sh" >&2
    exit 1
  fi
fi

echo "==> Attente de la base de dev..."
until pg_isready -d "$DEV_URL" >/dev/null 2>&1; do sleep 1; done

# 2) Dump de la prod (lecture seule) -> restauration dans la dev locale.
echo "==> Copie prod -> dev (prod en lecture seule)..."
ssh -o BatchMode=yes "$VPS" \
  "docker exec $PG_CONTAINER sh -c 'PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d $PROD_DB --no-owner --clean --if-exists'" \
  | psql "$DEV_URL" -v ON_ERROR_STOP=1 -q

# 3) Petit récap.
users=$(psql "$DEV_URL" -tAc 'select count(*) from users' 2>/dev/null || echo "?")
echo "==> Dev recall rafraîchie depuis la prod ✅  (users en base : ${users})"
