-- AlterTable: Add status column to epaper_editions
ALTER TABLE "epaper_editions" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'published';

-- AlterTable: Make pdfUrl nullable (drafts may not have a PDF yet)
ALTER TABLE "epaper_editions" ALTER COLUMN "pdfUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "epaper_editions_status_idx" ON "epaper_editions"("status");
