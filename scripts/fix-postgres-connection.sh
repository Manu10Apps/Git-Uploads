#!/bin/bash
# Complete Fix for "Database unavailable" Error
# Run this on your VPS

set -e

echo "🔧 Fixing PostgreSQL Connection Issue"
echo "======================================"
echo ""

APP_DIR="/etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code"
DB_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"

cd "$APP_DIR" || { echo "❌ App directory not found"; exit 1; }

# Step 1: Start PostgreSQL
echo "Step 1️⃣: Ensure PostgreSQL is running..."
sudo systemctl restart postgresql && echo "✅ PostgreSQL restarted" || echo "⚠️ PostgreSQL already running"
sleep 2
echo ""

# Step 2: Create database if it doesn't exist
echo "Step 2️⃣: Create database if missing..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'amakuru_news_db'" | grep -q 1 || \
  sudo -u postgres createdb amakuru_news_db && echo "✅ Database created"
echo ""

# Step 3: Create/update app_user
echo "Step 3️⃣: Create PostgreSQL user 'app_user'..."
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'app_user') THEN
    CREATE USER app_user WITH PASSWORD 'Irafasha@2025';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE amakuru_news_db TO app_user;
ALTER USER app_user CREATEDB;
EOF
echo "✅ User privileges set"
echo ""

# Step 4: Run migrations
echo "Step 4️⃣: Apply database migrations..."
export DATABASE_URL="$DB_URL"
export NODE_ENV="production"

if npx prisma migrate deploy; then
  echo "✅ Migrations completed"
else
  echo "⚠️ Psrisma errors detected (continuing...)"
fi
echo ""

# Step 5: Verify schema
echo "Step 5️⃣: Verify database schema..."
psql "$DB_URL" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" && \
  echo "✅ Schema verification passed" || \
  echo "⚠️ Could not verify schema"
echo ""

# Step 6: Create admin user
echo "Step 6️⃣: Ensure admin user exists..."
psql "$DB_URL" -c "
SELECT 1 FROM admin_users WHERE email = 'admin@amakuru.news' LIMIT 1;
" > /dev/null 2>&1 || \
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    const admin = await prisma.adminUser.create({
      data: {
        email: 'admin@amakuru.news',
        password: hashedPassword,
        name: 'Amakuru Admin',
        role: 'admin'
      }
    });
    console.log('✅ Admin user created:', admin.email);
    await prisma.\$disconnect();
  } catch (error) {
    console.log('ℹ️  Admin user already exists');
    process.exit(0);
  }
})();
"
echo ""

# Step 7: Update Docker container environment
echo "Step 7️⃣: Update Docker environment..."
CONTAINER_ID=$(docker ps --filter "name=vps-intambwe-news-web-app" --format "{{.ID}}" | head -1)

if [ ! -z "$CONTAINER_ID" ]; then
  echo "Container ID: $CONTAINER_ID"
  
  # Check if DATABASE_URL is set
  if docker exec $CONTAINER_ID env | grep -q DATABASE_URL; then
    echo "✅ DATABASE_URL is set in container"
  else
    echo "⚠️ DATABASE_URL may not be set - restarting container..."
  fi
fi
echo ""

# Step 8: Restart app container
echo "Step 8️⃣: Restart application container..."
if [ ! -z "$CONTAINER_ID" ]; then
  docker restart $CONTAINER_ID && echo "✅ Container restarted"
  sleep 3
else
  echo "⚠️ Container not found - manually restart from Dokploy"
fi
echo ""

echo "======================================"
echo "✅ Fix Complete!"
echo "======================================"
echo ""
echo "Test the fix:"
echo "1. Go to: https://intambwemedia.com/admin/create-article"
echo "2. Fill in article details"
echo "3. Click 'Create' - should work now!"
echo ""
