#!/bin/bash
# Quick CI/CD Deployment Script
# Place this in your deployment pipeline (GitHub Actions, GitLab CI, etc.)

set -e

echo "🚀 Deploying Analytics Schema..."

# These should be set as secrets in your CI/CD provider
# DATABASE_URL="postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/amakuru_news_db"

# Install dependencies if needed
npm ci --omit=dev

# Run migration
echo "📊 Applying analytics migrations..."
npx prisma migrate deploy

# Verify
echo "✅ Verifying deployment..."
npx prisma db execute --stdin << EOF
SELECT COUNT(*) as event_count FROM analytics_events;
EOF

echo "🎉 Analytics schema deployed successfully!"
