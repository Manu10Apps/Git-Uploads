BEGIN;
ALTER TABLE "article_translations" ADD COLUMN IF NOT EXISTS "gallery_captions" TEXT;
COMMIT;
