-- Direct SQL to add gallery_captions column to production database
-- Execute this on your production PostgreSQL database to fix the translation error

-- Check if column already exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'article_translations' 
    AND column_name = 'gallery_captions'
) AS column_exists;

-- Add the column (if it doesn't exist)
ALTER TABLE "article_translations" ADD COLUMN IF NOT EXISTS "gallery_captions" TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'article_translations' 
AND column_name = 'gallery_captions';
