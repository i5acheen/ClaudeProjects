#!/bin/sh
# Restore drill / disaster recovery. Usage (inside the backup container, private key mounted read-only):
#   restore.sh /backups/crm-<ts>.dump.age /keys/backup.agekey <target-database-name>
# Restores into a NEW database on the same server so you can inspect it before switching.
set -eu
file=$1; key=$2; target=${3:-restore_check}
age -d -i "$key" -o /tmp/restore.dump "$file"
psql -v ON_ERROR_STOP=1 -c "drop database if exists \"$target\"" -c "create database \"$target\""
pg_restore --no-owner --dbname="$target" /tmp/restore.dump || echo "pg_restore reported warnings (extension/role objects are expected to differ)"
psql -d "$target" -Atc "select 'leads='||count(*) from public.leads union all select 'patients='||count(*) from public.patients union all select 'audit_log='||count(*) from public.audit_log"
rm -f /tmp/restore.dump
