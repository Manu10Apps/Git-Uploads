#!/bin/bash
# Comprehensive PostgreSQL Connection Troubleshooting
# Run this on your VPS

echo "================================"
echo "PostgreSQL Connection Diagnostics"
echo "================================"
echo ""

# Step 1: Check if PostgreSQL service is running
echo "Step 1️⃣: PostgreSQL Service Status"
sudo systemctl status postgresql || echo "⚠️ PostgreSQL might not be running"
echo ""

# Step 2: Test local connection
echo "Step 2️⃣: Test Local PostgreSQL Connection"
sudo -u postgres psql -c "SELECT version();" && echo "✅ Local connection works" || echo "❌ Local connection failed"
echo ""

# Step 3: Check if database exists
echo "Step 3️⃣: Check if 'amakuru_news_db' database exists"
sudo -u postgres psql -lqt | grep -i amakuru && echo "✅ Database exists" || echo "❌ Database does not exist"
echo ""

# Step 4: Check Docker container environment
echo "Step 4️⃣: Check Docker Container Environment Variables"
CONTAINER_ID=$(docker ps --filter "name=vps-intambwe-news-web-app" --format "{{.ID}}" | head -1)

if [ ! -z "$CONTAINER_ID" ]; then
  echo "Container ID: $CONTAINER_ID"
  docker exec $CONTAINER_ID env | grep -i database
else
  echo "❌ Container not found or not running"
fi
echo ""

# Step 5: Test connection from inside container
echo "Step 5️⃣: Test Database Connection FROM Docker Container"
if [ ! -z "$CONTAINER_ID" ]; then
  docker exec $CONTAINER_ID psql "postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db" -c "SELECT 1;" && \
    echo "✅ Container can reach database" || \
    echo "❌ Container cannot reach database"
else
  echo "⚠️ Skipping (container not running)"
fi
echo ""

# Step 6: Check if app_user exists
echo "Step 6️⃣: Check PostgreSQL User 'app_user'"
sudo -u postgres psql -c "SELECT usename FROM pg_user WHERE usename = 'app_user';" && echo "✅ User exists" || echo "❌ User does not exist"
echo ""

# Step 7: Check Prisma schema status
echo "Step 7️⃣: Check Prisma Migration Status"
cd /etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code 2>/dev/null && \
  export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db" && \
  npx prisma migrate status 2>&1 | head -20 || \
  echo "⚠️ Could not check migrations"
echo ""

echo "================================"
echo "Diagnostics Complete"
echo "================================"
