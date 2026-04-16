# Production Database Fix: gallery_captions Column

## Problem

Translation feature works locally at http://localhost:3000 but fails on production VPS (https://intambwemedia.com/admin/) with error:

```
Failed to save: Invalid `prisma.articleTranslation.create()` invocation:
The column `gallery_captions` does not exist in the current database.
```

## Root Cause

- ✅ Local database: Has `gallery_captions` column (migration applied)
- ❌ Production database: Missing `gallery_captions` column (migration NOT applied)

## Solution

Choose ONE of the following methods to fix your production database:

---

### **Option 1: Automatic Python Script (Recommended)**

**Best for:** VPS with Python and psycopg2 installed

```bash
# On your VPS, in the project directory:
python3 fix-prod-gallery-captions.py
```

**Or with explicit database URL:**

```bash
python3 fix-prod-gallery-captions.py "postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/app_bd"
```

**What it does:**

- Checks if database is accessible
- Verifies column doesn't already exist
- Applies the migration
- Verifies success with detailed column listing

---

### **Option 2: Direct SQL Execution**

**Best for:** Direct database access via psql or pgAdmin

Use your PostgreSQL client to connect to: `postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/app_bd`

Then execute the SQL in `fix-prod-gallery-captions.sql`:

```sql
ALTER TABLE "article_translations" ADD COLUMN IF NOT EXISTS "gallery_captions" TEXT;
```

**Verification:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'article_translations'
AND column_name = 'gallery_captions';
```

Expected output:

```
 column_name      | data_type
------------------+-----------
 gallery_captions | text
```

---

### **Option 3: Prisma Migration (From VPS)**

**Best for:** VPS with npm/Node.js installed

```bash
# On your VPS, in the project directory:
npm install
npx prisma generate
npx prisma migrate deploy
```

This will:

1. Install dependencies
2. Generate Prisma client
3. Apply all pending migrations (including gallery_captions)

---

### **Option 4: Docker Deployment (If using Docker)**

If your VPS uses Docker:

```bash
# Enter the container
docker exec -it your_container_name sh

# Apply migration
cd /app
npx prisma migrate deploy
```

---

## Verification

After applying the fix, verify the column exists:

### Via SQL:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'article_translations'
AND column_name = 'gallery_captions';
```

### Via Python:

```bash
python3 fix-prod-gallery-captions.py
```

### Via Prisma:

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM article_translations LIMIT 1;"
```

---

## Testing After Fix

1. **Clear browser cache** - Refresh https://intambwemedia.com/admin/
2. **Create/Edit an article** with:
   - Title
   - Excerpt
   - Content
   - Gallery images with captions
3. **Click "Translate & Save All"**
4. **Verify:**
   - Translation completes without errors
   - Translated content appears in database
   - Gallery captions are preserved

---

## Troubleshooting

### "psycopg2 not installed"

Install it on VPS:

```bash
pip3 install psycopg2-binary
```

### "Connection refused"

Check:

- Database host is correct: `intambwemedia.com` (or internal VPS hostname)
- Port is correct: `5432`
- Network firewall allows connection
- Database user/password is correct

### "Password authentication failed"

Check `.env.local` has correct production credentials. Should look like:

```
DATABASE_URL_RUNTIME=postgresql://app_user:Irafasha@2025@intambwemedia.com:5432/app_bd
```

### "Column already exists"

That's fine! The fix already applied. Try translating an article now.

---

## Database Connection Details

From `.env.example`:

```
Host: intambwemedia.com (or internal VPS hostname)
Port: 5432
Database: app_bd
User: app_user
Password: Irafasha@2025
Schema: public
```

---

## Files Provided

1. **fix-prod-gallery-captions.py** - Automated Python fix (recommended)
2. **fix-prod-gallery-captions.sql** - Raw SQL commands
3. **fix-prod-gallery-captions.js** - Node.js version
4. **FIX_PRODUCTION_DATABASE.md** - This document

---

## Next Steps

1. Choose your fix method above
2. Run the fix on your VPS
3. Wait for success message
4. Test translation feature on https://intambwemedia.com/admin/
5. Verify gallery captions are preserved

If you have any issues, check the troubleshooting section or provide the error output.

---

**Last Updated:** April 16, 2026
**Status:** Ready for deployment
