#!/bin/bash
# Create admin user on production server
# Run this script ON your VPS server

set -e

cd /etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code

echo "🔐 Creating admin user for Amakuru..."

# Set production environment
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
export NODE_ENV="production"

# Create the admin user using Node
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  
  try {
    const email = 'admin@amakuru.news';
    const password = 'AdminPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if exists
    const existing = await prisma.adminUser.findUnique({
      where: { email }
    });
    
    if (existing) {
      console.log('❌ Admin already exists:', email);
      process.exit(0);
    }
    
    // Create admin
    const admin = await prisma.adminUser.create({
      data: {
        email: email,
        password: hashedPassword,
        name: 'Amakuru Admin',
        role: 'admin'
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('---');
    console.log('You can now login at: https://intambwemedia.com/admin/login');
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo "✅ Done!"
