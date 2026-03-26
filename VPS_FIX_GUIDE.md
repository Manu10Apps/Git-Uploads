# VPS Infrastructure Fix Guide

## Critical Issues Found

1. ❌ Node.js v18.19.1 (requires v20+)
2. ❌ PostgreSQL not installed
3. ❌ Database migrations not applied
4. ⚠️ Docker container status unclear

## Solution Path (Execute in Order)

### Step 1: Upgrade Node.js from v18 to v20+ ⏱️ 5-10 minutes

**Why:** Prisma requires Node v20. Current v18 shows "Unsupported engine" warnings.

```bash
# SSH to VPS
ssh root@intambwemedia.com

# Add NodeSource repository for Node v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node v20
sudo apt-get install -y nodejs

# Verify installation (should show v20.x.x)
node --version
npm --version

# Exit SSH
exit
```

---

### Step 2: Install PostgreSQL ⏱️ 10-15 minutes

**Why:** All API endpoints fail because database doesn't exist.

```bash
# SSH to VPS
ssh root@intambwemedia.com

# Update package lists
sudo apt-get update

# Install PostgreSQL and contrib utilities
sudo apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL to run on boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql

# Create database user
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'Irafasha@2025';"

# Create database
sudo -u postgres createdb -O app_user amakuru_news_db

# Grant permissions
sudo -u postgres psql -c "GRANT CONNECT ON DATABASE amakuru_news_db TO app_user;"

# Verify database created
sudo -u postgres psql -l | grep amakuru_news_db

# Exit SSH
exit
```

---

### Step 3: Apply Database Migrations ⏱️ 3-5 minutes

**Why:** Creates all necessary tables (articles, categories, analytics_events, etc.).

```bash
# SSH to VPS
ssh root@intambwemedia.com

# Navigate to application root
# (Update path based on your actual Dokploy container path)
cd /var/lib/dokploy/applications/your-app-id/code

# Set DATABASE_URL for runtime
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"

# Run Prisma migrations
npx prisma migrate deploy

# Expected output:
#   ✓ Migrations applied: 4 migrations in 2.4s
#   ✓ Done

# Verify tables created
sudo -u postgres psql amakuru_news_db -c "\dt"
# Should show: articles, categories, admin_users, analytics_events tables

# Exit SSH
exit
```

---

### Step 4: Update Environment Variables on VPS ⏱️ 2-3 minutes

**Why:** Docker container needs DATABASE_URL at runtime.

```bash
# SSH to VPS
ssh root@intambwemedia.com

# Find your Docker container (or check Dokploy dashboard)
docker ps | grep intambwe

# Update container environment (via Dokploy dashboard is recommended)
# Add to environment variables:
# DATABASE_URL=postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db
# ALLOW_FALLBACK_STORAGE=false
# STRICT_POSTGRESQL=true

# Or manually edit if using docker-compose:
# nano /path/to/docker-compose.yml

# Restart container
docker restart <container-id>

# Exit SSH
exit
```

---

### Step 5: Verify Everything Works ⏱️ 2-3 minutes

```bash
# SSH to VPS to test
ssh root@intambwemedia.com

# Test database connection
cd /var/lib/dokploy/applications/your-app-id/code
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) as article_count FROM articles;
SELECT COUNT(*) as event_count FROM analytics_events;
EOF

# Expected: Should show 0 rows for both (tables created but empty)

# Test Node.js version
node --version  # Should be v20.x.x

# Test npm
npm --version   # Should be v10.x.x or higher

# Exit SSH
exit
```

---

## Local Testing Before VPS Deployment

1. **Add to `.env.local`:**

   ```
   NEXT_PUBLIC_TIMEZONEDB_KEY=your_actual_key_here
   ```

2. **Test locally:**

   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Check TopBar shows timezone without CORS errors
   # Try creating an article in /admin/create-article
   ```

3. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Fix: Use environment variable for TimezoneDB API key with fallback"
   git push -u origin main
   ```

4. **Trigger Dokploy redeploy:**
   - Go to Dokploy dashboard
   - Find your deployment
   - Click "Redeploy"
   - Monitor build logs until ✅ Success

---

## Expected Results

| Component           | Before                      | After             |
| ------------------- | --------------------------- | ----------------- |
| Node.js version     | v18.19.1 ❌                 | v20.x.x ✅        |
| PostgreSQL          | Not installed ❌            | Running ✅        |
| API /articles       | 503 Database unavailable ❌ | 200 Success ✅    |
| API /analytics/send | 500 Error ❌                | 200 Success ✅    |
| TopBar timezone     | CORS error ❌               | Shows timezone ✅ |
| Database tables     | Don't exist ❌              | 4 tables exist ✅ |

---

## Troubleshooting

**PostgreSQL still shows "not found"?**

```bash
ssh root@intambwemedia.com
sudo systemctl restart postgresql && sudo systemctl status postgresql
```

**Node.js update didn't take effect in Docker?**

```bash
# Rebuild Docker container from Dokploy
# Go to dashboard → Redeploy → Full rebuild
```

**Migrations failed?**

```bash
# Check migration status
npx prisma migrate status

# If stuck, reset (⚠️ drops all data):
npx prisma migrate reset --force
```

**Database connection still times out?**
Check if PostgreSQL is listening:

```bash
sudo netstat -tlnp | grep postgres
# Should show port 5432 listening
```

---

## Automated Script (Optional)

Save as `fix-vps-infra.sh`:

```bash
#!/bin/bash

echo "=== VPS Infrastructure Fix ==="

# Step 1: Update Node.js
echo "Step 1: Upgrading Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Step 2: Install PostgreSQL
echo "Step 2: Installing PostgreSQL..."
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Step 3: Create database user and DB
echo "Step 3: Creating database..."
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'Irafasha@2025';"
sudo -u postgres createdb -O app_user amakuru_news_db

# Step 4: Apply migrations
echo "Step 4: Applying database migrations..."
cd /var/lib/dokploy/applications/your-app-id/code
export DATABASE_URL="postgresql://app_user:Irafasha@2025@localhost:5432/amakuru_news_db"
npx prisma migrate deploy

echo "=== Fix Complete ==="
node --version
psql --version
```

Run with: `bash fix-vps-infra.sh`

---

## Documentation Links

- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/
- Prisma Migrations: https://www.prisma.io/docs/orm/prisma-migrate
- Docker CLI: https://docs.docker.com/engine/reference/commandline/
