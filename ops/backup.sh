#!/usr/bin/env bash
# Hostinger VPS: encrypted storage/offsite copying must be configured separately.
# Run from project root: bash ops/backup.sh /secure/backup/dir
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
TARGET="${1:-$PWD/private-backups}"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DB_OUT="$TARGET/smartfuel-db-$TS.sql.gz"
FILES_OUT="$TARGET/smartfuel-files-$TS.tar.gz"
# Dump via the running database container, without putting DB passwords into logs.
docker compose exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$DB_OUT"
test -s "$DB_OUT"
# App-owned storage is mounted by the web service container. Stop nothing while archiving;
# for a strict consistent restore, schedule backup during a maintenance window.
docker compose exec -T web tar -czf - -C /service/storage . > "$FILES_OUT"
test -s "$FILES_OUT"
sha256sum "$DB_OUT" "$FILES_OUT" > "$TARGET/smartfuel-checksums-$TS.txt"
# retention may be adjusted to your data retention policy; files are private.
find "$TARGET" -maxdepth 1 -type f \( -name 'smartfuel-db-*.sql.gz' -o -name 'smartfuel-files-*.tar.gz' -o -name 'smartfuel-checksums-*.txt' \) -mtime +14 -delete
printf 'Backups created: %s and %s\n' "$DB_OUT" "$FILES_OUT"
printf 'IMPORTANT: Copy backups to encrypted offsite storage; test restore regularly.\n'
