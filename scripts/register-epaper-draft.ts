/**
 * register-epaper-draft.ts
 * ------------------------
 * Called by epaper-weekly-cron.sh after PDF generation to upsert the
 * draft edition record in the database directly (no HTTP auth needed).
 *
 * Usage:
 *   npx tsx scripts/register-epaper-draft.ts \
 *     --title "Intambwe Media Peper No 015" \
 *     --date 2026-04-13 \
 *     --pdf /uploads/epaper/intambwe-media-peper-no-015.pdf
 */

import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const title = getArg('--title', '');
const dateStr = getArg('--date', new Date().toISOString().split('T')[0]);
const pdfUrl = getArg('--pdf', '');

if (!title || !pdfUrl) {
  console.error('Usage: register-epaper-draft.ts --title "..." --date YYYY-MM-DD --pdf /uploads/epaper/file.pdf');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const issueDate = new Date(dateStr + 'T12:00:00Z');

  try {
    // Find the first admin user to assign as author
    const admin = await prisma.adminUser.findFirst({ orderBy: { id: 'asc' } });
    if (!admin) {
      console.error('No admin user found in database');
      process.exit(1);
    }

    // Upsert by issueDate (unique constraint)
    const edition = await prisma.epaperEdition.upsert({
      where: { issueDate },
      create: {
        title,
        issueDate,
        pdfUrl,
        status: 'draft',
        createdBy: admin.id,
      },
      update: {
        title,
        pdfUrl,
        status: 'draft',
      },
    });

    console.log(`✔ Edition upserted: id=${edition.id} title="${edition.title}" status=${edition.status}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed to register draft:', err);
  process.exit(1);
});
