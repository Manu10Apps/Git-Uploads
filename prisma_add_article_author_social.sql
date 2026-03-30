ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "authorSocialPlatform" TEXT,
  ADD COLUMN IF NOT EXISTS "authorSocialUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "authorSocialPlatform2" TEXT,
  ADD COLUMN IF NOT EXISTS "authorSocialUrl2" TEXT;
