#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_FILE="${BACKUP_FILE:-/tmp/eiasc-cril-restore-drill.dump}"
RESTORE_DB="${RESTORE_DB:-eiasc_cril_restore_drill}"
BASE_DATABASE_URL="$(python3 - "$DATABASE_URL" <<'PY'
import sys
from urllib.parse import urlparse, urlunparse
source = urlparse(sys.argv[1])
print(urlunparse((source.scheme, source.netloc, source.path, '', '', '')))
PY
)"

cleanup() {
  psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\" WITH (FORCE);" >/dev/null 2>&1 || true
  rm -f "$BACKUP_FILE"
}
trap cleanup EXIT

pg_dump "$BASE_DATABASE_URL" --format=custom --file="$BACKUP_FILE"
psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\" WITH (FORCE);"
psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${RESTORE_DB}\";"

RESTORE_URL="$(python3 - "$BASE_DATABASE_URL" "$RESTORE_DB" <<'PY'
import sys
from urllib.parse import urlparse, urlunparse
source = urlparse(sys.argv[1])
db = sys.argv[2]
print(urlunparse((source.scheme, source.netloc, '/' + db, '', '', '')))
PY
)"

pg_restore --no-owner --no-privileges --dbname="$RESTORE_URL" "$BACKUP_FILE"

COUNT="$(psql "$RESTORE_URL" -tAc 'SELECT COUNT(*) FROM "User";')"
if [[ "$COUNT" =~ ^[0-9]+$ ]]; then
  echo "Backup/restore drill PASS: restored User rows = $COUNT"
else
  echo "Backup/restore drill FAIL: restored database validation failed" >&2
  exit 1
fi
