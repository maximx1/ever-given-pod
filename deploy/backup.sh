#!/bin/sh
# Copies the database (db.json) out of the running container. With --uploads it also
# archives the audio and images, which can be many gigabytes.
#   deploy/backup.sh [--uploads] [directory]      (default directory: ./backups)
# Run it from the folder that holds compose.yaml.
set -eu

uploads=no
if [ "${1:-}" = "--uploads" ]; then
    uploads=yes
    shift
fi

dest="${1:-./backups}"
stamp="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$dest"
# The app replaces db.json in one step when it saves, so a copy is never half-written.
docker compose cp app:/data/db.json "$dest/db-$stamp.json"
echo "Saved $dest/db-$stamp.json"

if [ "$uploads" = yes ]; then
    docker compose exec -T app tar -C /data -cf - uploads > "$dest/uploads-$stamp.tar"
    echo "Saved $dest/uploads-$stamp.tar"
fi
