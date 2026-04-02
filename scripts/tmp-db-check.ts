import { prisma } from '../lib/prisma';

async function main() {
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'articles'
      AND column_name IN ('authorSocialPlatform','authorSocialUrl','authorSocialPlatform2','authorSocialUrl2')
      ORDER BY column_name
    `);
    console.log('columns', cols);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "articles"
        ADD COLUMN IF NOT EXISTS "authorSocialPlatform" TEXT,
        ADD COLUMN IF NOT EXISTS "authorSocialUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "authorSocialPlatform2" TEXT,
        ADD COLUMN IF NOT EXISTS "authorSocialUrl2" TEXT
      `);
      console.log('alter-ok');
    } catch (alterError) {
      console.error('alter-failed', alterError);
    }
  } catch (error) {
    console.error('db-check-error', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
