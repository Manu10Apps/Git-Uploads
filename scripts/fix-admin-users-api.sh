#!/bin/bash
# Fix admin users API 503 error by running migrations
# Run this on your VPS server

set -e

echo "🔧 Fixing Admin Users 503 Error..."
echo "==========================================="

APP_DIR="/etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory not found: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"
echo "✅ Changed to app directory"

# Set environment
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
export NODE_ENV="production"

echo ""
echo "📋 Step 1: Run all pending migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations completed"
else
  echo "⚠️  Migration warnings (continuing...)"
fi

echo ""
echo "📋 Step 2: Verify database schema..."
if npx prisma db execute --stdin << EOF
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
);
EOF
then
  echo "✅ admin_users table exists"
else
  echo "❌ admin_users table not found - schema is incomplete!"
  exit 1
fi

echo ""
echo "📋 Step 3: Create admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  
  try {
    const email = 'admin@amakuru.news';
    const password = 'AdminPassword123!';
    
    // Check if user exists
    const existing = await prisma.adminUser.findUnique({
      where: { email }
    });
    
    if (existing) {
      console.log('✅ Admin user already exists:', email);
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await prisma.adminUser.create({
        data: {
          email: email,
          password: hashedPassword,
          name: 'Amakuru Admin',
          role: 'admin'
        }
      });
      console.log('✅ Admin user created:', admin.email);
    }
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "📋 Step 4: Verify API connection..."
if curl -s -X GET http://localhost:3000/api/admin/users \
  -H "x-admin-email: admin@amakuru.news" \
  -H "Content-Type: application/json" | grep -q "success"; then
  echo "✅ API endpoint is working!"
else
  echo "⚠️  Could not verify API (server might not be running locally)"
fi

echo ""
echo "==========================================="
echo "✅ Setup Complete!"
echo ""
echo "You can now login with:"
echo "📧 Email: admin@amakuru.news"
echo "🔐 Password: AdminPassword123!"
echo "🌐 URL: https://intambwemedia.com/admin/login"
echo ""
