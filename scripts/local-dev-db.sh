#!/usr/bin/env bash
# BH HR — local dev database helper
#
# The production deployment (Vercel) uses Supabase PostgreSQL, so
# prisma/schema.prisma must stay provider = "postgresql" in git.
# This sandbox has no outbound access to Supabase, so local dev uses SQLite.
#
# Usage:
#   bash scripts/local-dev-db.sh sqlite   # switch local dev to SQLite (default sandbox DB: db/custom.db)
#   bash scripts/local-dev-db.sh postgres # switch back to PostgreSQL (before committing/pushing)
#
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-sqlite}"

if [ "$MODE" = "sqlite" ]; then
  sed -i 's/provider  = "postgresql"/provider  = "sqlite"/' prisma/schema.prisma
  echo 'DATABASE_URL=file:/home/z/bh-hr/db/custom.db' > .env
  bunx prisma db push --skip-generate >/dev/null 2>&1 || bunx prisma db push
  bunx prisma generate
  echo "OK: Local dev switched to SQLite (db/custom.db)."
  echo "    If the DB is empty, seed with:"
  echo "      bun run prisma/seed.ts && bun run prisma/seed-templates.ts && bun run prisma/seed-today-attendance.ts && bun run prisma/seed-assets-training.ts"
elif [ "$MODE" = "postgres" ]; then
  sed -i 's/provider  = "sqlite"/provider  = "postgresql"/' prisma/schema.prisma
  echo "OK: Schema switched back to PostgreSQL (do NOT commit the sqlite provider!)."
  echo "    NOTE: commit/push now, then run 'bash scripts/local-dev-db.sh sqlite' to continue local dev."
else
  echo "Unknown mode: $MODE (use 'sqlite' or 'postgres')"
  exit 1
fi
