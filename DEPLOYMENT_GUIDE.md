# Analytics Deployment Guide

## Overview

The analytics schema needs to be deployed to your production PostgreSQL database at `intambwemedia.com:5432`. This guide provides two automated deployment scripts to make the process seamless.

---

## Quick Start (Recommended)

### For Linux/Unix Servers (Bash)

1. **Copy the script to your server:**

   ```bash
   scp deploy-analytics.sh user@intambwemedia.com:/home/user/
   ```

2. **SSH into your server:**

   ```bash
   ssh user@intambwemedia.com
   ```

3. **Make the script executable:**

   ```bash
   chmod +x deploy-analytics.sh
   ```

4. **Run the deployment:**

   ```bash
   ./deploy-analytics.sh /path/to/your/amakuru-news-app
   ```

   Or if the script is run from the app directory:

   ```bash
   ./deploy-analytics.sh
   ```

### For Windows Servers (PowerShell)

1. **Copy the script to your server** (using SCP or SFTP):

   ```powershell
   scp deploy-analytics.ps1 user@intambwemedia.com:C:\app\
   ```

2. **Connect via RDP or SSH and open PowerShell:**

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Run the deployment:**
   ```powershell
   .\deploy-analytics.ps1 -AppPath "C:\path\to\amakuru-news-app"
   ```

---

## What These Scripts Do

✅ Validate directory structure and Prisma configuration  
✅ Check database connectivity  
✅ Run `npx prisma migrate deploy` with proper environment variables  
✅ Verify the AnalyticsEvent table was created  
✅ Display success/error messages with color-coded output

---

## Manual Deployment (If Script Fails)

If you prefer to deploy manually or the script encounters issues:

```bash
# SSH into your server
ssh user@intambwemedia.com

# Navigate to your app directory
cd /path/to/your/amakuru-news-app

# Set the database URL
export DATABASE_URL="postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/amakuru_news_db"

# Run the migration
npx prisma migrate deploy

# Verify success
npx prisma db execute --stdin << EOF
SELECT COUNT(*) as event_count FROM analytics_events;
EOF
```

---

## Verification After Deployment

Once the deployment completes, verify everything works:

### Check Table Exists

```bash
export DATABASE_URL="postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/amakuru_news_db"
npx prisma db execute --stdin << EOF
\dt analytics_events
EOF
```

### Check Schema Structure

```bash
npx prisma db execute --stdin << EOF
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
EOF
```

### Check Indexes

```bash
npx prisma db execute --stdin << EOF
SELECT indexname FROM pg_indexes
WHERE tablename = 'analytics_events';
EOF
```

---

## API Testing After Deployment

### Test Analytics Event Collection

```bash
curl -X POST https://intambwemedia.com/api/analytics/send \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "visitorId": "test-visitor-456",
    "pageUrl": "/test",
    "pageTitle": "Test Page",
    "eventType": "pageview",
    "eventName": "test_event",
    "referrer": "https://example.com"
  }'
```

Expected response:

```json
{
  "success": true,
  "eventId": "clxxxxx...",
  "message": "Event recorded"
}
```

### Test Analytics Dashboard

Visit: `https://intambwemedia.com/analytics`

You should see:

- Summary cards (Pageviews, Unique Visitors, Sessions, Avg Duration, Scroll Depth)
- Charts (Top Pages, Traffic by Device, Traffic by Country, Traffic by Browser, Hourly Traffic)
- Date range filter buttons (7/30/90 days)

---

## Troubleshooting

### Database Connection Refused

```
Error: P1001: Can't reach database server at `intambwemedia.com:5432`
```

**Solution:** Ensure you're running the script ON the server or have network access to port 5432.

### Permission Denied

```
Error: permission denied while trying to connect to the Docker daemon
```

**Solution:** Ensure your user has proper permissions for Node.js/npm, or use `sudo`.

### Migration Already Applied

```
Nothing to migrate, database is up to date
```

**Status:** ✅ This is good! Your schema is already deployed.

### npx not found

```
Error: npx: command not found
```

**Solution:** Install Node.js on the server:

- Ubuntu/Debian: `sudo apt-get install nodejs npm`
- CentOS/RHEL: `sudo yum install nodejs npm`

---

## Rollback (If Needed)

To rollback to the previous migration:

```bash
export DATABASE_URL="postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/amakuru_news_db"

# List migrations
npx prisma migrate status

# Rollback (use with caution - drops analytics data!)
npx prisma migrate resolve --rolled-back "20260325_add_analytics_events"
```

⚠️ **Warning:** Rolling back will delete the `analytics_events` table and all collected data.

---

## Next Steps

After successful deployment:

1. ✅ Monitor analytics collection: Check `/api/analytics/stats`
2. ✅ Test dashboard: Visit `/analytics` page
3. ✅ Monitor performance: Watch database query times
4. ✅ Set up backups: Ensure analytics data is backed up regularly
5. ✅ Configure CORS: Verify `analytics.intambwemedia.com` subdomain if needed

---

## Support

For issues or questions:

1. Check server logs: `tail -f /var/log/app.log`
2. Check Prisma logs: `DEBUG=* npx prisma migrate deploy`
3. Verify database credentials in environment variables
4. Ensure PostgreSQL service is running: `systemctl status postgresql` or `service postgresql status`

---

**Deployment Date:** 2026-03-25  
**Migration:** `20260325_add_analytics_events`  
**Tables Created:** `analytics_events`  
**Records:** Indexes on sessionId, visitorId, eventType, pageUrl, createdAt, country
