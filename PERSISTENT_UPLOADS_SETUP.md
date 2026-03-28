# Persistent Uploads – Dokploy Setup Guide

## Problem

When Dokploy rebuilds the application container (triggered by a `git push`), the
container filesystem is recreated from scratch. Any images that were uploaded via
the admin panel at runtime are stored inside the container and are **destroyed**
during the rebuild.

## Solution

Mount a **persistent Docker volume** so that uploaded images live outside the
container and survive rebuilds.

---

## Step-by-step (Dokploy Dashboard)

### 1. Create a host directory for uploads

SSH into your VPS and create a directory that will hold all uploads permanently:

```bash
ssh root@intambwemedia.com
mkdir -p /data/uploads
chmod 755 /data/uploads
```

### 2. Copy existing uploads (one-time migration)

If the current container still has uploaded images, copy them to the new
persistent directory before they are lost:

```bash
# Find the running container
CONTAINER=$(docker ps --filter "name=intambwe" --format "{{.ID}}" | head -1)

# Copy uploads from the container to the host
docker cp "$CONTAINER:/app/public/uploads/." /data/uploads/

# Verify
ls -la /data/uploads/
```

### 3. Add the volume mount in Dokploy

1. Open the **Dokploy dashboard** → select your application.
2. Go to **Advanced** → **Volumes** (or **Mounts**).
3. Add a new volume/bind mount:

   | Field          | Value           |
   | -------------- | --------------- |
   | Host Path      | `/data/uploads` |
   | Container Path | `/data/uploads` |

4. **Save** the configuration.

### 4. Add the `UPLOAD_DIR` environment variable

1. In Dokploy, go to **Environment Variables**.
2. Add:

   ```
   UPLOAD_DIR=/data/uploads
   ```

3. Save.

### 5. Redeploy

Trigger a redeploy (or push new code). The new container will:

- Save uploaded images to `/data/uploads` (the persistent volume).
- Serve images from `/data/uploads` via the route handler.
- Survive all future rebuilds without losing uploads.

---

## How it works

| Component                               | Without `UPLOAD_DIR`         | With `UPLOAD_DIR=/data/uploads` |
| --------------------------------------- | ---------------------------- | ------------------------------- |
| Upload API (`/api/upload`)              | Saves to `public/uploads/`   | Saves to `/data/uploads/`       |
| Route handler (`/uploads/[...slug]`)    | Reads from `public/uploads/` | Reads from `/data/uploads/`     |
| Static files in git (`public/uploads/`) | Served by Next.js directly   | Served by Next.js directly      |

Images whose files exist in `public/uploads/` (e.g. the fallback SVG committed
to git) are served directly by Next.js's static-file layer and never hit the
route handler.

---

## Verification

After redeploying with the volume mount:

```bash
# Upload a test image via the admin panel, then verify it persists:
ssh root@intambwemedia.com
ls -la /data/uploads/

# Trigger another deploy (push a trivial commit)
# After rebuild, the image should still be accessible:
curl -sI https://intambwemedia.com/uploads/<filename>.jpg | head -5
```

You should see `HTTP/2 200` with `Content-Type: image/jpeg`.
