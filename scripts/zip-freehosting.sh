#!/usr/bin/env bash
# Build the site for freehosting.dev and zip the contents of dist/.
# Usage: npm run zip   (or: bash scripts/zip-freehosting.sh [output.zip])
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/../inodepi-freehosting.zip}"
SITE_URL="${SITE_URL:-https://inodepi.freehosting.dev}"

cd "$ROOT"
SITE_URL="$SITE_URL" npm run build

printf 'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap-index.xml\n' "$SITE_URL" > dist/robots.txt

cat > dist/.htaccess <<'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
</IfModule>

ErrorDocument 404 /404.html

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType video/mp4 "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
</IfModule>
EOF

rm -f "$OUT"
( cd dist && zip -rq "$OUT" . -x '*.DS_Store' )
echo "wrote $OUT"
