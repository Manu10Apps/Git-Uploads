-- AlterTable: Add notes column for auto-generated weekly article summary
ALTER TABLE "epaper_editions" ADD COLUMN IF NOT EXISTS "notes" TEXT;
