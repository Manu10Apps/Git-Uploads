-- CreateTable: article_translations
CREATE TABLE IF NOT EXISTS "article_translations" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "translationSource" TEXT NOT NULL DEFAULT 'ai',
    "versionHash" TEXT NOT NULL,
    "translatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: category_translations
CREATE TABLE IF NOT EXISTS "category_translations" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "translatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "article_translations_articleId_idx" ON "article_translations"("articleId");
CREATE INDEX IF NOT EXISTS "article_translations_language_idx" ON "article_translations"("language");
CREATE UNIQUE INDEX IF NOT EXISTS "article_translations_articleId_language_key" ON "article_translations"("articleId", "language");

CREATE INDEX IF NOT EXISTS "category_translations_categoryId_idx" ON "category_translations"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "category_translations_categoryId_language_key" ON "category_translations"("categoryId", "language");

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
