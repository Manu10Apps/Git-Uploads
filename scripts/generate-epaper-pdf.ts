/**
 * generate-epaper-pdf.ts
 * ---------------------
 * Generates a newspaper-style A4 PDF for Intambwe Media E-Gazeti.
 *
 * Usage:
 *   npx tsx scripts/generate-epaper-pdf.ts [--issue "Title"] [--date 2026-04-06]
 *                                          [--days 7] [--out public/uploads/epaper]
 *
 * Fetches last N days of published articles from the database, then lays
 * them out in a multi-column newspaper format and saves the PDF file.
 */

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
  degrees,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} from 'pdf-lib';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const ISSUE_TITLE = getArg('--issue', '');
const ISSUE_DATE_STR = getArg('--date', new Date().toISOString().split('T')[0]);
const DAYS_BACK = parseInt(getArg('--days', '7'), 10);
const OUT_DIR = getArg('--out', path.join(process.cwd(), 'public', 'uploads', 'epaper'));

// ─── Colours ──────────────────────────────────────────────────────────────────
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const DARK_RED = rgb(0.72, 0.04, 0.04);
const LIGHT_GREY = rgb(0.9, 0.9, 0.9);
const MID_GREY = rgb(0.5, 0.5, 0.5);

// ─── Page geometry ────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const COL_GAP = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helper: wrap text to max width, return array of lines ───────────────────
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Helper: clip text to single line with ellipsis ──────────────────────────
function clipText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 0 && font.widthOfTextAtSize(clipped + '…', size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

// ─── Draw text block, returns new yCursor ────────────────────────────────────
function drawWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  leading: number,
  color = BLACK,
  maxLines = 99,
): number {
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  for (const line of lines) {
    page.drawText(line, { x, y, font, size, color });
    y -= leading;
  }
  return y;
}

// ─── Draw horizontal rule ─────────────────────────────────────────────────────
function rule(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  thickness = 1,
  color = BLACK,
) {
  page.drawRectangle({ x, y, width: w, height: thickness, color });
}

// ─── Article shape ────────────────────────────────────────────────────────────
interface ArticleRow {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  publishedAt: Date | null;
}

// ─── Fetch articles from DB ───────────────────────────────────────────────────
async function fetchArticles(issueDate: Date, daysBack: number): Promise<ArticleRow[]> {
  const prisma = new PrismaClient();
  const from = new Date(issueDate);
  from.setDate(from.getDate() - daysBack);

  try {
    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: from, lte: issueDate },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        author: true,
        category: { select: { name: true } },
        publishedAt: true,
        featured: true,
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      author: r.author,
      category: r.category.name,
      publishedAt: r.publishedAt,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Format date helpers ──────────────────────────────────────────────────────
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Draw masthead (page 1 only) ──────────────────────────────────────────────
function drawMasthead(
  page: PDFPage,
  fonts: { bold: PDFFont; regular: PDFFont; italic: PDFFont },
  issueDate: Date,
  editionTitle: string,
  editionNumber: string,
): number {
  let y = PAGE_H - MARGIN;

  // Top info bar
  const barY = y - 14;
  page.drawRectangle({ x: MARGIN, y: barY, width: CONTENT_W, height: 14, color: DARK_RED });
  page.drawText('INTAMBWE MEDIA — DIGITAL EDITION', {
    x: MARGIN + 4,
    y: barY + 2.5,
    font: fonts.bold,
    size: 6.5,
    color: WHITE,
  });
  const dateStr = fmtDate(issueDate).toUpperCase();
  const dateW = fonts.regular.widthOfTextAtSize(dateStr, 6.5);
  page.drawText(dateStr, {
    x: MARGIN + CONTENT_W - dateW - 4,
    y: barY + 2.5,
    font: fonts.regular,
    size: 6.5,
    color: WHITE,
  });
  y = barY - 6;

  // Name
  const name = 'INTAMBWE MEDIA';
  const nameSize = 54;
  const nameW = fonts.bold.widthOfTextAtSize(name, nameSize);
  page.drawText(name, {
    x: (PAGE_W - nameW) / 2,
    y: y - nameSize,
    font: fonts.bold,
    size: nameSize,
    color: BLACK,
  });
  y -= nameSize + 2;

  // Tagline
  const tagline = `"Amakuru y'ukuri — Ubutabera bw'amakuru"`;
  const taglineSize = 9.5;
  const taglineW = fonts.italic.widthOfTextAtSize(tagline, taglineSize);
  page.drawText(tagline, {
    x: (PAGE_W - taglineW) / 2,
    y,
    font: fonts.italic,
    size: taglineSize,
    color: MID_GREY,
  });
  y -= taglineSize + 8;

  // Thick rule
  rule(page, MARGIN, y, CONTENT_W, 3, DARK_RED);
  y -= 3;

  // Edition info row
  const edInfo = `E-GAZETI  ${editionTitle ? '• ' + editionTitle + '  ' : ''}• No. ${editionNumber}`;
  const pubDate = `Published: ${fmtDate(issueDate)}`;
  page.drawText(edInfo, { x: MARGIN, y: y - 9, font: fonts.bold, size: 7.5, color: BLACK });
  const pdW = fonts.regular.widthOfTextAtSize(pubDate, 7.5);
  page.drawText(pubDate, { x: MARGIN + CONTENT_W - pdW, y: y - 9, font: fonts.regular, size: 7.5, color: MID_GREY });
  y -= 9 + 5;

  // Thin rule
  rule(page, MARGIN, y, CONTENT_W, 0.75);
  y -= 8;

  return y;
}

// ─── Draw a multi-column article block, returns new yBottom ──────────────────
function drawArticleBlock(
  page: PDFPage,
  fonts: { bold: PDFFont; regular: PDFFont; italic: PDFFont },
  article: ArticleRow,
  x: number,
  y: number,
  colW: number,
  isFeatured: boolean,
): number {
  const headSize = isFeatured ? 18 : 11;
  const headLeading = isFeatured ? 22 : 14;
  const excerptSize = isFeatured ? 9 : 8;
  const excerptLeading = isFeatured ? 13 : 11;
  const metaSize = 7;

  // Category pill
  const catText = article.category.toUpperCase();
  const catW = fonts.bold.widthOfTextAtSize(catText, 7) + 8;
  page.drawRectangle({ x, y: y - 11, width: catW, height: 11, color: DARK_RED });
  page.drawText(catText, { x: x + 4, y: y - 9, font: fonts.bold, size: 7, color: WHITE });
  y -= 15;

  // Headline
  y = drawWrapped(page, article.title, fonts.bold, headSize, x, y, colW, headLeading, BLACK, isFeatured ? 3 : 2);
  y -= 3;

  // Excerpt
  y = drawWrapped(page, article.excerpt, fonts.regular, excerptSize, x, y, colW, excerptLeading, BLACK, isFeatured ? 6 : 4);
  y -= 3;

  // By-line
  const meta = `By ${article.author}${article.publishedAt ? '   ' + fmtShort(article.publishedAt) : ''}`;
  page.drawText(clipText(meta, fonts.italic, metaSize, colW), {
    x,
    y,
    font: fonts.italic,
    size: metaSize,
    color: MID_GREY,
  });
  y -= metaSize + 8;

  // Thin separator
  rule(page, x, y + 4, colW, 0.4, LIGHT_GREY);

  return y;
}

// ─── Draw page footer ─────────────────────────────────────────────────────────
function drawFooter(page: PDFPage, fonts: { bold: PDFFont; regular: PDFFont; italic: PDFFont }, pageNum: number, issueDate: Date) {
  const y = MARGIN - 4;
  rule(page, MARGIN, y + 12, CONTENT_W, 0.75);
  const left = 'Intambwe Media  |  intambwemedia.com';
  const right = `Page ${pageNum}  |  ${fmtDate(issueDate)}`;
  page.drawText(left, { x: MARGIN, y, font: fonts.regular, size: 7, color: MID_GREY });
  const rW = fonts.regular.widthOfTextAtSize(right, 7);
  page.drawText(right, { x: MARGIN + CONTENT_W - rW, y, font: fonts.regular, size: 7, color: MID_GREY });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📰  Intambwe Media — E-Gazeti PDF Generator');
  console.log(`    Issue date : ${ISSUE_DATE_STR}`);
  console.log(`    Days back  : ${DAYS_BACK}`);
  console.log(`    Output dir : ${OUT_DIR}`);

  const issueDate = new Date(ISSUE_DATE_STR + 'T12:00:00Z');

  // Fetch articles
  let articles: ArticleRow[] = [];
  try {
    articles = await fetchArticles(issueDate, DAYS_BACK);
    console.log(`    Articles   : ${articles.length} found`);
  } catch (err) {
    console.warn('    ⚠ Could not connect to DB, using demo content');
    // Demo fallback so the script still works without a DB connection
    articles = [
      { id: 1, title: 'Mu butumwa bwa Pasika 2026, Papa Leo XIV yasabye Isi kureka urwango', excerpt: 'Mu butumwa bwe bwa Pasika 2026, Papa Leo XIV yasabye abakurikira Ubukristu bose gushyigikira amahoro mu isi, akagira ati kureka urwango ni intsinzi.', author: 'Intambwe Media', category: 'Imyemerere', publishedAt: new Date('2026-04-05') },
      { id: 2, title: 'Perezida Ndayishimiye yifatanyije n\'Abakirisitu mu Nzira y\'Umusaraba', excerpt: 'Perezida Évariste Ndayishimiye wa Burundi yifatanyije n\'Abakirisitu mu misa ya Nzira y\'Umusaraba yabereyeho i Bujumbura.', author: 'Chief Editor', category: 'Imyemerere', publishedAt: new Date('2026-04-04') },
      { id: 3, title: 'Artemis II: Icyogajuru cy\'Abanyamerika Cyoherejwe mu Isanzure', excerpt: 'NASA yohereje Artemis II mu isanzure, ari intambwe ikomeye mu gahunda yo gusubira ku kwezi. Ibi biratubuza gutekereza ku iterambere.', author: 'Intambwe Media', category: 'Ikoranabuhanga', publishedAt: new Date('2026-04-03') },
      { id: 4, title: 'Izamuka Rikabije ry\'Ibikomoka kuri Petrole mu Rwanda', excerpt: 'Bwa mbere mu myaka, ama peteroli aramaze kuzamuka mbere y\'iteganywa rishingiye ku bukungu bw\'u Rwanda, bikora ishyaka ry\'ubukungu.', author: 'Intambwe Media', category: 'Ubukungu', publishedAt: new Date('2026-04-02') },
      { id: 5, title: 'Sénégal yamaganye icyemezo cyo kwamburwa AFCON 2025', excerpt: 'Federasiyo y\'umupira wa Sénégal yamaganye icyemezo cya CAF cyo kwamburwa igikombe cya AFCON 2025, kigahabwa Maroc.', author: 'Chief Editor', category: 'Siporo', publishedAt: new Date('2026-04-01') },
      { id: 6, title: 'Ibidakunze kuvugwa ku Nama y\'Abaminisitiri n\'ibyemezo yafashe', excerpt: 'Nama y\'Abaminisitiri yateranye kuri uyu wa Kane tariki ya 2 Mata 2026 kugirango ifate ibyemezo bikomeye byerekeye igihugu.', author: 'Chief Editor', category: 'Politiki', publishedAt: new Date('2026-04-02') },
      { id: 7, title: 'DC Clement: Abakoresheje imbuga nkoranyambaga bakwiye kwigira', excerpt: 'Urubanza rwa DC Clement rugaragaza ingaruka mbi zo gukoresha imbuga nkoranyambaga nabi mu Rwanda.', author: 'Emmanuel Ndahayo', category: 'Ubutabera', publishedAt: new Date('2026-04-01') },
      { id: 8, title: 'Iturika rikomeye mu Kigo cya Gisirikare i Bujumbura', excerpt: 'Iturika rikomeye ryabereye mu kigo cya gisirikare i Bujumbura, abaturage batashye ubwoba, ariko leta iravuga ko ariyo mpamvu.', author: 'Emmanuel Ndahayo', category: 'Afrika y\'Iburasirazuba', publishedAt: new Date('2026-04-02') },
      { id: 9, title: 'Amerika Yohereje Ingabo Zidasanzwe mu Burasirazuba bwo Hagati', excerpt: 'Leta Zunze Ubumwe z\'Amerika yohereje ingabo zidasanzwe mu Burasirazuba bwo Hagati mu gihe intambara ikomeje gukaza umurego.', author: 'Chief Editor', category: 'Mu Mahanga', publishedAt: new Date('2026-04-03') },
      { id: 10, title: 'OneTaste: Uwashinze yakatiwe imyaka 9 y\'igifungo', excerpt: 'Uwashinze OneTaste yakatiwe imyaka 9 y\'igifungo kubera gukoresha abantu uburetwa, urubanza rugaragaza ingaruka mbi zo gukoresha.', author: 'Chief Editor', category: 'Ubuzima', publishedAt: new Date('2026-03-31') },
    ];
  }

  if (articles.length === 0) {
    console.error('    ✗ No articles found for this period.');
    process.exit(1);
  }

  // ─── Build PDF ────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Intambwe Media E-Gazeti — ${fmtDate(issueDate)}`);
  pdfDoc.setAuthor('Intambwe Media');
  pdfDoc.setSubject('Digital Newspaper Edition');
  pdfDoc.setCreator('Intambwe Media PDF Generator');
  pdfDoc.setProducer('pdf-lib');
  pdfDoc.setCreationDate(new Date());

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fonts = { bold: boldFont, regular: regularFont, italic: italicFont };

  // Edition number: e.g. "001" based on day-of-year
  const startOfYear = new Date(issueDate.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((issueDate.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  const editionNumber = String(weekNum).padStart(3, '0');

  // ─── Page layout config ──────────────────────────────────────────────────
  const NUM_COLS = 3;
  const colW = (CONTENT_W - COL_GAP * (NUM_COLS - 1)) / NUM_COLS;

  let pageNum = 0;
  let page: PDFPage;
  let y: number;
  let artIndex = 0;

  const newPage = (): [PDFPage, number] => {
    pageNum += 1;
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const startY = pageNum === 1
      ? drawMasthead(p, fonts, issueDate, ISSUE_TITLE, editionNumber)
      : PAGE_H - MARGIN;
    if (pageNum > 1) {
      // Continuation header on page 2+
      rule(p, MARGIN, startY, CONTENT_W, 2, DARK_RED);
      p.drawText('INTAMBWE MEDIA', { x: MARGIN, y: startY - 12, font: boldFont, size: 9, color: DARK_RED });
      const dateTxt = fmtDate(issueDate);
      const dtW = regularFont.widthOfTextAtSize(dateTxt, 7.5);
      p.drawText(dateTxt, { x: MARGIN + CONTENT_W - dtW, y: startY - 11, font: regularFont, size: 7.5, color: MID_GREY });
      rule(p, MARGIN, startY - 15, CONTENT_W, 0.5);
      drawFooter(p, fonts, pageNum, issueDate);
      return [p, startY - 25];
    }
    drawFooter(p, fonts, pageNum, issueDate);
    return [p, startY];
  };

  [page, y] = newPage();

  // ─── Page 1: Featured article (full width) ───────────────────────────────
  const featured = articles[artIndex++];
  y = drawArticleBlock(page, fonts, featured, MARGIN, y, CONTENT_W, true);

  // Thick divider below the feature
  rule(page, MARGIN, y + 4, CONTENT_W, 1.5, DARK_RED);
  y -= 12;

  // ─── Remaining articles in 3 columns ─────────────────────────────────────
  const BOTTOM_LIMIT = MARGIN + 22; // footer clearance

  const colX = (col: number) => MARGIN + col * (colW + COL_GAP);
  let colCursors = [y, y, y]; // independent y per column
  let currentCol = 0;

  while (artIndex < articles.length) {
    const article = articles[artIndex++];

    // Estimate space needed (rough)
    const linesHead = wrapText(article.title, boldFont, 11, colW).length;
    const linesExc = wrapText(article.excerpt, regularFont, 8, colW).slice(0, 4).length;
    const estimatedH = 15 + linesHead * 14 + linesExc * 11 + 30;

    // Advance column or page if needed
    if (colCursors[currentCol] - estimatedH < BOTTOM_LIMIT) {
      currentCol += 1;
      if (currentCol >= NUM_COLS) {
        // Move to new page
        [page, y] = newPage();
        colCursors = [y, y, y];
        currentCol = 0;
      }
    }

    const newY = drawArticleBlock(
      page, fonts, article,
      colX(currentCol),
      colCursors[currentCol],
      colW,
      false,
    );
    colCursors[currentCol] = newY;

    // Draw vertical separators between columns
    for (let c = 0; c < NUM_COLS - 1; c++) {
      const sepX = colX(c + 1) - COL_GAP / 2;
      const topY = pageNum === 1 ? (y + 10) : PAGE_H - MARGIN - 30;
      const botY = BOTTOM_LIMIT + 10;
      page.drawRectangle({ x: sepX - 0.25, y: botY, width: 0.5, height: topY - botY, color: LIGHT_GREY });
    }
  }

  // ─── Final decorative page: Table of Contents ────────────────────────────
  const tocPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pageNum += 1;
  drawFooter(tocPage, fonts, pageNum, issueDate);

  // Red header bar
  tocPage.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN - 32, width: CONTENT_W, height: 32, color: DARK_RED });
  tocPage.drawText('TABLE OF CONTENTS', { x: MARGIN + 10, y: PAGE_H - MARGIN - 22, font: boldFont, size: 14, color: WHITE });

  let tocY = PAGE_H - MARGIN - 50;
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    if (tocY < MARGIN + 30) break;
    const num = String(i + 1).padStart(2, '0');
    const catTxt = `[${a.category}]`;
    tocPage.drawText(num, { x: MARGIN, y: tocY, font: boldFont, size: 9, color: DARK_RED });
    tocPage.drawText(catTxt, { x: MARGIN + 22, y: tocY, font: boldFont, size: 8, color: MID_GREY });
    const titleClipped = clipText(a.title, regularFont, 9, CONTENT_W - 80);
    tocPage.drawText(titleClipped, { x: MARGIN + 22 + catTxt.length * 5.2 + 4, y: tocY, font: regularFont, size: 9, color: BLACK });
    rule(tocPage, MARGIN, tocY - 3, CONTENT_W, 0.3, LIGHT_GREY);
    tocY -= 16;
  }

  // ─── Serialise and write ──────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();

  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  const safeName = (ISSUE_TITLE || `intambwe-media-${ISSUE_DATE_STR}`)
    .toLowerCase()
    .replace(/[^\w-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fileName = `${safeName}.pdf`;
  const outPath = path.join(OUT_DIR, fileName);
  await writeFile(outPath, pdfBytes);

  console.log(`\n  ✔ PDF saved: ${outPath}`);
  console.log(`    Pages: ${pdfDoc.getPageCount()} | Articles: ${articles.length}`);
  console.log(`\n  To upload to E-Paper Manager, go to /admin/epaper and use "Upload PDF"\n`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
