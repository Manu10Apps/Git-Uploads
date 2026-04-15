-- Add gallery_captions column to article_translations table to store translated gallery captions
ALTER TABLE article_translations ADD COLUMN gallery_captions LONGTEXT;
