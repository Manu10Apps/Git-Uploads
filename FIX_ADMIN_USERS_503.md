# Fix Admin Users API 503 Error

## Problem

When accessing `/admin/users`, you get: `Failed to load resource: the server responded with a status of 503`

## Root Cause

- Database password is expired or connection failed
- Database migrations are incomplete
- Admin user table doesn't exist

---

## Solution

### Quick Fix (Run on VPS)

**Step 1: SSH into your server**

```bash
ssh root@intambwemedia.com
```

**Step 2: Navigate to app directory**

```bash
cd /etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code
```

**Step 3: Run migrations**

```bash
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
npx prisma migrate deploy
```

**Step 4: Create admin user**

```bash
export NODE_ENV="production"
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  const email = 'admin@amakuru.news';
  const password = 'AdminPassword123!';

  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await prisma.adminUser.create({
        data: { email, password: hashedPassword, name: 'Amakuru Admin', role: 'admin' }
      });
      console.log('✅ Admin created:', admin.email);
    } else {
      console.log('✅ Admin already exists');
    }

    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
```

**Step 5: Restart your app (if using Docker)**

```bash
docker restart vps-intambwe-news-web-app-intambwemedia-wyrvby
```

Or if using Dokploy, redeploy from the dashboard.

---

## Verify Fix

**Try logging in:**

- URL: https://intambwemedia.com/admin/login
- Email: `admin@amakuru.news`
- Password: `AdminPassword123!`

**Or test API directly:**

```bash
curl -X GET https://intambwemedia.com/api/admin/users \
  -H "x-admin-email: admin@amakuru.news" \
  -H "Content-Type: application/json"
```

Should return: `{"success":true,"users":[...]}`

---

## If Still Getting 503

Check database connection:

```bash
psql postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db -c "SELECT 1;"
```

Check if admin_users table exists:

```bash
psql postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db -c "\d admin_users"
```

View app logs:

```bash
docker logs vps-intambwe-news-web-app-intambwemedia-wyrvby -f
```

---

## Alternative: Re-run Full Seed

If above doesn't work, run the complete seed:

```bash
cd /etc/dokploy/applications/vps-intambwe-news-web-app-intambwemedia-wyrvby/code
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
npx prisma migrate reset --force
```

⚠️ **Warning**: This will delete all data and recreate the schema from scratch.
