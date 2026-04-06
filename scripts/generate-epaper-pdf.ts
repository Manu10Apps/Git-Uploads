/**
 * scripts/generate-epaper-pdf.ts
 * --------------------------------
 * CLI wrapper around lib/epaper-pdf-generator.ts
 *
 * Usage:
 *   npx tsx scripts/generate-epaper-pdf.ts [--issue "Title"] [--date 2026-04-06]
 *                                           [--days 7] [--out public/uploads/epaper]
 */
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateEpaperPDF, EpaperArticle } from '@/lib/epaper-pdf-generator';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag: string, fallback: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const ISSUE_TITLE   = getArg('--issue', '');
const ISSUE_DATE_STR = getArg('--date', new Date().toISOString().split('T')[0]);
const DAYS_BACK     = parseInt(getArg('--days', '7'), 10);
const OUT_DIR       = getArg('--out', path.join(process.cwd(), 'public', 'uploads', 'epaper'));

// ── Fetch articles from DB ────────────────────────────────────────────────────
async function fetchArticles(issueDate: Date, daysBack: number): Promise<EpaperArticle[]> {
  const prisma = new PrismaClient();
  const from   = new Date(issueDate);
  from.setDate(from.getDate() - daysBack);
  try {
    const rows = await prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: from, lte: issueDate } },
      select: {
        id: true, title: true, excerpt: true, author: true,
        category: { select: { name: true } }, publishedAt: true, featured: true,
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });
    return rows.map(r => ({
      id: r.id, title: r.title, excerpt: r.excerpt, author: r.author,
      category: r.category.name, publishedAt: r.publishedAt,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

// ── Demo fallback ─────────────────────────────────────────────────────────────
const DEMO_ARTICLES: EpaperArticle[] = [
  { id: 1, title: "Mu butumwa bwa Pasika 2026, Papa Leo XIV yasabye Isi kureka urwango", excerpt: "Mu butumwa bwe bwa Pasika 2026, Papa Leo XIV yasabye abakurikira Ubukristu bose gushyigikira amahoro mu isi.", author: 'Intambwe Media', category: 'Imyemerere', publishedAt: new Date('2026-04-05') },
  { id: 2, title: "Perezida Ndayishimiye yifatanyije n'Abakirisitu mu Nzira y'Umusaraba", excerpt: "Perezida Évariste Ndayishimiye wa Burundi yifatanyije n'Abakirisitu mu misa ya Nzira y'Umusaraba.", author: 'Chief Editor', category: 'Imyemerere', publishedAt: new Date('2026-04-04') },
  { id: 3, title: "Artemis II: Icyogajuru cy'Abanyamerika Cyoherejwe mu Isanzure", excerpt: "NASA yohereje Artemis II mu isanzure, ari intambwe ikomeye mu gahunda yo gusubira ku kwezi.", author: 'Intambwe Media', category: 'Ikoranabuhanga', publishedAt: new Date('2026-04-03') },
  { id: 4, title: "Izamuka Rikabije ry'Ibikomoka kuri Petrole mu Rwanda", excerpt: "Bwa mbere mu myaka, ama peteroli aramaze kuzamuka mbere y'iteganywa rishingiye ku bukungu bw'u Rwanda.", author: 'Intambwe Media', category: 'Ubukungu', publishedAt: new Date('2026-04-02') },
  { id: 5, title: "Sénégal yamaganye icyemezo cyo kwamburwa AFCON 2025", excerpt: "Federasiyo y'umupira wa Sénégal yamaganye icyemezo cya CAF cyo kwamburwa igikombe cya AFCON 2025.", author: 'Chief Editor', category: 'Siporo', publishedAt: new Date('2026-04-01') },
  { id: 6, title: "Ibidakunze kuvugwa ku Nama y'Abaminisitiri n'ibyemezo yafashe", excerpt: "Nama y'Abaminisitiri yateranye kuri uyu wa Kane tariki ya 2 Mata 2026 kugirango ifate ibyemezo bikomeye.", author: 'Chief Editor', category: 'Politiki', publishedAt: new Date('2026-04-02') },
  { id: 7, title: "DC Clement: Abakoresheje imbuga nkoranyambaga bakwiye kwigira", excerpt: "Urubanza rwa DC Clement rugaragaza ingaruka mbi zo gukoresha imbuga nkoranyambaga nabi mu Rwanda.", author: 'Emmanuel Ndahayo', category: 'Ubutabera', publishedAt: new Date('2026-04-01') },
  { id: 8, title: "Iturika rikomeye mu Kigo cya Gisirikare i Bujumbura", excerpt: "Iturika rikomeye ryabereye mu kigo cya gisirikare i Bujumbura, abaturage batashye ubwoba.", author: 'Emmanuel Ndahayo', category: "Afrika y'Iburasirazuba", publishedAt: new Date('2026-04-02') },
  { id: 9, title: "Amerika Yohereje Ingabo Zidasanzwe mu Burasirazuba bwo Hagati", excerpt: "Leta Zunze Ubumwe z'Amerika yohereje ingabo zidasanzwe mu Burasirazuba bwo Hagati.", author: 'Chief Editor', category: 'Mu Mahanga', publishedAt: new Date('2026-04-03') },
  { id: 10, title: "OneTaste: Uwashinze yakatiwe imyaka 9 y'igifungo", excerpt: "Uwashinze OneTaste yakatiwe imyaka 9 y'igifungo kubera gukoresha abantu uburetwa.", author: 'Chief Editor', category: 'Ubuzima', publishedAt: new Date('2026-03-31') },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📰  Intambwe Media — E-Gazeti PDF Generator');
  console.log(`    Issue date : ${ISSUE_DATE_STR}`);
  console.log(`    Days back  : ${DAYS_BACK}`);
  console.log(`    Output dir : ${OUT_DIR}`);

  const issueDate = new Date(ISSUE_DATE_STR + 'T12:00:00Z');

  let articles: EpaperArticle[] = [];
  try {
    articles = await fetchArticles(issueDate, DAYS_BACK);
    console.log(`    Articles   : ${articles.length} found in DB`);
  } catch {
    console.warn('    ⚠  Could not connect to DB — using demo content');
    articles = DEMO_ARTICLES;
  }

  if (articles.length === 0) {
    console.error('    ✗ No articles found for this period.');
    process.exit(1);
  }

  const result = await generateEpaperPDF({
    issueTitle: ISSUE_TITLE || `Intambwe Media E-Gazeti ${ISSUE_DATE_STR}`,
    issueDate,
    articles,
    outDir: OUT_DIR,
  });

  console.log(`\n  ✔ PDF saved : ${result.filePath}`);
  console.log(`    Pages     : ${result.pageCount}`);
  console.log(`    Size      : ${(result.fileSize / 1024).toFixed(1)} KB`);
  console.log(`    Public URL: ${result.publicUrl}`);
  console.log('\n  → Open /admin/epaper and attach this PDF to the draft edition.\n');
}

main().catch(err => { console.error('Error generating PDF:', err); process.exit(1); });

