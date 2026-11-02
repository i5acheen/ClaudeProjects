# pg_dump must match the server's major version (Supabase ships Postgres 17).
FROM postgres:17-alpine
RUN apk add --no-cache age rclone tar
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
