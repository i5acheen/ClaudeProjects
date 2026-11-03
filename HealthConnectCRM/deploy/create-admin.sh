#!/bin/sh
# Creates the organisation (if none) and the first admin user. Usage:
#   sh deploy/create-admin.sh "Org name" admin@example.in "Full Name"
set -eu
here=$(cd "$(dirname "$0")" && pwd)
cd "$here/supabase"
org_name=$1; email=$2; full_name=${3:-Admin}
key=$(grep '^SERVICE_ROLE_KEY=' .env | cut -d= -f2-)
port=$(grep '^API_GW_HTTP_PORT=' .env | cut -d= -f2- || true)
q() { docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -qAtc "$1"; }
org=$(q "select id from public.orgs order by created_at limit 1")
[ -n "$org" ] || org=$(q "insert into public.orgs(name) values ('$(printf %s "$org_name" | sed "s/'/''/g")') returning id")
body=$(printf '{"email":"%s","email_confirm":true,"app_metadata":{"org_id":"%s","role":"admin","full_name":"%s"}}' "$email" "$org" "$full_name")
curl -fsS -X POST "http://127.0.0.1:${port:-8000}/auth/v1/admin/users" \
  -H "apikey: $key" -H "Authorization: Bearer $key" -H "Content-Type: application/json" -d "$body" >/dev/null
echo "admin $email created in org $org — sign in at the CRM with an email code"
