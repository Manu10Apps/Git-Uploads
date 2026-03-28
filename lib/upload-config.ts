import path from 'path';

/**
 * Returns the directory where uploaded files are stored.
 *
 * In production (Docker/Dokploy), set the UPLOAD_DIR environment variable
 * to a path backed by a persistent volume (e.g. /data/uploads).
 * In development, defaults to <project>/public/uploads so files are
 * served by Next.js's static-file handler automatically.
 */
export function getUploadsDir(): string {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR;
  }
  return path.join(process.cwd(), 'public', 'uploads');
}
