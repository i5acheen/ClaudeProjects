#!/bin/sh
# One-time setup of the self-hosted stack on a fresh Linux server with Docker (docs/SELF_HOSTING.md).
# Re-running is safe: existing secrets in deploy/supabase/.env and crm.env are kept.
set -eu
# Containers (Postgres runs as its own user) must read the copied init scripts; secret files are chmod 600 below.
umask 022
here=$(cd "$(dirname "$0")" && pwd)
SUPABASE_COMMIT=4a92bac8d86a1e505847fe11b6b2646bd73163de   # pinned official self-hosting files (2026-11-02)
[ -f "$here/site.env" ] || { echo "Create deploy/site.env from deploy/site.env.example first"; exit 1; }
set -a; . "$here/site.env"; set +a

dir="$here/supabase"
if [ ! -d "$dir" ]; then
  tmp=$(mktemp -d)
  git clone -q --filter=blob:none --no-checkout https://github.com/supabase/supabase "$tmp/supabase"
  git -C "$tmp/supabase" sparse-checkout set docker
  git -C "$tmp/supabase" checkout -q "$SUPABASE_COMMIT"
  cp -r "$tmp/supabase/docker" "$dir"
  chmod -R a+rX "$dir/volumes"
  rm -rf "$tmp"
fi
cd "$dir"

set_env() { # set_env FILE KEY VALUE  (replace or append, value written verbatim)
  f=$1; k=$2; v=$3
  if grep -q "^$k=" "$f"; then
    awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $1==k{print k"="v; next} {print}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  else
    printf '%s=%s\n' "$k" "$v" >> "$f"
  fi
}
get_env() { grep "^$2=" "$1" | head -1 | cut -d= -f2-; }

if [ ! -f .env ]; then
  cp .env.example .env
  sh utils/generate-keys.sh --update-env >/dev/null
  set_env .env POOLER_TENANT_ID "$(openssl rand -hex 8)"
  set_env .env INNGEST_EVENT_KEY "$(openssl rand -hex 32)"
  set_env .env INNGEST_SIGNING_KEY "$(openssl rand -hex 32)"
  set_env .env GLITCHTIP_DB_PASSWORD "$(openssl rand -hex 24)"
  set_env .env GLITCHTIP_SECRET_KEY "$(openssl rand -hex 32)"
fi

# Site-specific settings (always refreshed from site.env)
set_env .env COMPOSE_FILE "docker-compose.yml:docker-compose.crm.yml"
set_env .env CRM_SOURCE_DIR "../.."
set_env .env SITE_SCHEME "$SITE_SCHEME"
set_env .env APP_HOST "$APP_HOST"
set_env .env API_HOST "$API_HOST"
set_env .env ERRORS_HOST "$ERRORS_HOST"
set_env .env CRM_SUPABASE_PUBLIC_URL "$SITE_SCHEME://$API_HOST"
set_env .env SUPABASE_PUBLIC_URL "$SITE_SCHEME://$API_HOST"
set_env .env API_EXTERNAL_URL "$SITE_SCHEME://$API_HOST/auth/v1"
set_env .env SITE_URL "$SITE_SCHEME://$APP_HOST"
set_env .env ADDITIONAL_REDIRECT_URLS "$SITE_SCHEME://$APP_HOST/auth/callback"
# Invite-only: staff accounts are created by an admin (CLAUDE.md §8.1).
set_env .env DISABLE_SIGNUP true
set_env .env ENABLE_EMAIL_SIGNUP true
set_env .env ENABLE_EMAIL_AUTOCONFIRM false
set_env .env ENABLE_PHONE_SIGNUP false
set_env .env ENABLE_PHONE_AUTOCONFIRM false
set_env .env ENABLE_ANONYMOUS_USERS false
set_env .env SMTP_ADMIN_EMAIL "$ADMIN_EMAIL"
set_env .env SMTP_HOST "$SMTP_HOST"
set_env .env SMTP_PORT "$SMTP_PORT"
set_env .env SMTP_USER "$SMTP_USER"
set_env .env SMTP_PASS "$SMTP_PASS"
set_env .env SMTP_SENDER_NAME "\"$SMTP_SENDER_NAME\""
set_env .env STUDIO_DEFAULT_ORGANIZATION "\"HealthConnect\""
set_env .env STUDIO_DEFAULT_PROJECT "\"HealthConnectCRM\""
set_env .env BACKUP_AGE_RECIPIENT "$BACKUP_AGE_RECIPIENT"
set_env .env BACKUP_RCLONE_REMOTE "$BACKUP_RCLONE_REMOTE"
chmod 600 .env

cp "$here/docker-compose.crm.yml" "$here/Caddyfile.crm" .
rm -rf crm-backup && cp -r "$here/crm-backup" .
mkdir -p backups && [ -f rclone.conf ] || : > rclone.conf

# App secrets (Meta / WhatsApp / AI): fill these in by hand after setup.
if [ ! -f crm.env ]; then
  cat > crm.env <<ENV
APP_BASE_URL=$SITE_SCHEME://$APP_HOST
INNGEST_EVENT_KEY=$(get_env .env INNGEST_EVENT_KEY)
INNGEST_SIGNING_KEY=$(get_env .env INNGEST_SIGNING_KEY)
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=$(openssl rand -hex 32)
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_GRAPH_VERSION=v21.0
WA_PHONE_NUMBER_ID=
WA_BUSINESS_ACCOUNT_ID=
WA_ACCESS_TOKEN=
WA_VERIFY_TOKEN=$(openssl rand -hex 32)
# AI: none = rules only (default). Later: anthropic | gemini | openai_compat (self-hosted open model)
AI_PROVIDER=none
AI_MODEL=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
AI_BASE_URL=
AI_API_KEY=
# GlitchTip project DSN (create the project in GlitchTip first)
SENTRY_DSN=
ENV
  chmod 600 crm.env
fi

echo "Setup written to $dir"
echo "Next: fill $dir/crm.env, then:  cd $dir && docker compose up -d --build && sh ../migrate.sh"
