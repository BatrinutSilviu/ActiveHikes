#!/bin/sh
# Debug helper: checks whether the app serves a given /uploads file internally,
# bypassing Traefik entirely. Run from the app container:
#   docker compose exec app sh scripts/check-upload.sh /uploads/hike-covers/<filename>

PATH_TO_CHECK="${1:-/uploads/hike-covers/1783349647205-Retezat_Mountain_Lakes.jpg}"

node -e "
require('http').get('http://localhost:3000${PATH_TO_CHECK}', r => {
  console.log('status:', r.statusCode);
  r.resume();
});
" 2>&1 || true

echo "---"
echo "file on disk:"
ls -la "public${PATH_TO_CHECK}" 2>&1 || true
