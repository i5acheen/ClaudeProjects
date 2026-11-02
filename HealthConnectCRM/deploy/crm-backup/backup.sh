#!/bin/sh
# Every BACKUP_INTERVAL_HOURS: dump the whole Supabase database (public, auth, storage metadata) and the
# document files, encrypt with age (public key only on the server — the private key stays offline),
# keep BACKUP_RETENTION_DAYS locally and copy off-site with rclone when BACKUP_RCLONE_REMOTE is set.
# Every step is checked explicitly: `set -e` does not apply inside a function called from `||`.
set -u
INTERVAL=$(( ${BACKUP_INTERVAL_HOURS:-6} * 3600 ))
RCLONE="rclone --config /config/rclone/rclone.conf"

log() { printf '{"level":"%s","msg":"%s"%s}\n' "$1" "$2" "${3:-}"; }

run_once() {
  [ -n "${BACKUP_AGE_RECIPIENT:-}" ] || { log error backup.no_recipient; return 1; }
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  out="/backups/crm-$ts"
  log info backup.start ",\"ts\":\"$ts\""
  pg_dump --format=custom --no-owner --file="$out.dump" || { log error backup.pg_dump_failed; rm -f "$out.dump"; return 1; }
  tar -C /storage -cf "$out.storage.tar" . || { log error backup.tar_failed; rm -f "$out.dump" "$out.storage.tar"; return 1; }
  for f in "$out.dump" "$out.storage.tar"; do
    # Never keep unencrypted patient data on disk, even when encryption fails.
    if ! age -r "$BACKUP_AGE_RECIPIENT" -o "$f.age" "$f"; then
      log error backup.encrypt_failed; rm -f "$out.dump" "$out.storage.tar" "$out.dump.age" "$out.storage.tar.age"; return 1
    fi
    rm -f "$f"
  done
  if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
    $RCLONE copy "$out.dump.age" "$BACKUP_RCLONE_REMOTE" && $RCLONE copy "$out.storage.tar.age" "$BACKUP_RCLONE_REMOTE" \
      || { log error backup.offsite_failed; return 1; }
    $RCLONE delete --min-age "${BACKUP_RETENTION_DAYS:-14}d" "$BACKUP_RCLONE_REMOTE" || log warn backup.offsite_prune_failed
  fi
  find /backups -name 'crm-*.age' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
  log info backup.done ",\"file\":\"$out.dump.age\",\"bytes\":$(stat -c %s "$out.dump.age")"
}

if [ "${1:-}" = "--once" ]; then run_once; exit $?; fi
while true; do
  run_once || log error backup.failed
  sleep "$INTERVAL"
done
