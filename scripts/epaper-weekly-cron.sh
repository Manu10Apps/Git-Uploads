#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# epaper-weekly-cron.sh
# Generates the weekly Intambwe Media E-Gazeti PDF every Monday at 15:00 Kigali.
#
# Cron (runs at 12:00 UTC = 15:00 Kigali/EAT every Monday):
#   0 12 * * 1 /etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code/scripts/epaper-weekly-cron.sh >> /var/log/epaper-cron.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_DIR="/etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX ──────────────────────────────────────"
echo "$LOG_PREFIX Starting E-Gazeti weekly PDF generation"

# ── Navigate to project ───────────────────────────────────────────────────────
cd "$PROJECT_DIR"

# ── Set production env ────────────────────────────────────────────────────────
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
export NODE_ENV="production"

# ── Calculate issue date (today = Monday) and issue number ────────────────────
ISSUE_DATE=$(date '+%Y-%m-%d')

# Week-of-year as zero-padded 3-digit issue number (001–053)
ISSUE_NUM=$(date '+%V')          # ISO week number
ISSUE_NUM_PADDED=$(printf '%03d' "$((10#$ISSUE_NUM))")

ISSUE_TITLE="Intambwe Media Peper No $ISSUE_NUM_PADDED"

echo "$LOG_PREFIX Issue date  : $ISSUE_DATE"
echo "$LOG_PREFIX Issue title : $ISSUE_TITLE"

# ── Generate PDF ──────────────────────────────────────────────────────────────
npx tsx scripts/generate-epaper-pdf.ts \
  --issue "$ISSUE_TITLE" \
  --date  "$ISSUE_DATE" \
  --days  7 \
  --out   "$PROJECT_DIR/public/uploads/epaper"

echo "$LOG_PREFIX PDF generation complete"

# ── Auto-create draft edition in database ─────────────────────────────────────
# Build the expected filename (mirrors the logic in generate-epaper-pdf.ts)
SAFE_NAME=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')
PDF_URL="/uploads/epaper/${SAFE_NAME}.pdf"

echo "$LOG_PREFIX PDF URL     : $PDF_URL"

npx tsx scripts/register-epaper-draft.ts \
  --title "$ISSUE_TITLE" \
  --date  "$ISSUE_DATE" \
  --pdf   "$PDF_URL" \
  && echo "$LOG_PREFIX Draft edition registered in database" \
  || echo "$LOG_PREFIX ⚠ Could not register edition — log in to /admin/epaper to upload manually"

echo "$LOG_PREFIX Done ✔"
echo "$LOG_PREFIX ──────────────────────────────────────"
