#!/bin/sh
# Applies supabase/migrations/*.sql that have not run yet (tracked in crm_meta.applied_migrations).
# Usage: sh deploy/migrate.sh [--seed]      (run from anywhere; needs the stack up)
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
cd "$here/supabase"
psql() { docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 "$@"; }

# Supabase Auth and Storage create their own tables when their containers first start; our migrations
# reference auth.users and storage.buckets, so wait for them (matters on a brand-new install).
for i in $(seq 1 90); do
  ready=$(psql -Atc "select (to_regclass('auth.users') is not null and to_regclass('storage.buckets') is not null)::text")
  [ "$ready" = "true" ] && break
  [ "$i" = 1 ] && echo "waiting for Supabase Auth and Storage to finish their setup..."
  sleep 2
done
[ "$ready" = "true" ] || { echo "auth.users / storage.buckets not created — check: docker compose logs auth storage" >&2; exit 1; }

psql -qc "create schema if not exists crm_meta; create table if not exists crm_meta.applied_migrations (name text primary key, applied_at timestamptz not null default now());"
for f in "$root"/supabase/migrations/*.sql; do
  name=$(basename "$f")
  if [ "$(psql -Atc "select 1 from crm_meta.applied_migrations where name = '$name'")" = "1" ]; then continue; fi
  echo "applying $name"
  { cat "$f"; printf "\ninsert into crm_meta.applied_migrations(name) values ('%s');\n" "$name"; } | psql -q -1 -f -
done
if [ "${1:-}" = "--seed" ]; then
  echo "loading SAMPLE seed data (never on a production database with real patients)"
  psql -q -1 -f - < "$root/supabase/seed.sql"
fi
echo "migrations up to date"
