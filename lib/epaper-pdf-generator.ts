/**
 * lib/epaper-pdf-generator.ts
 * ----------------------------
 * Generates a designed newspaper-style A4 PDF for Intambwe Media E-Gazeti.
 * Layout inspired by the Imvaho Nshya print design (dsgn1.png):
 *   - Red masthead with paper name + tagline + issue box
 *   - Thin info bar (issue no., date, address, website)
 *   - 4-column category teaser row
 *   - Full-featured article (large headline + two-column body + image area)
 *   - 3-column grid for remaining articles
 *   - Table of contents final page
 *   - Footer bar on every page
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EpaperArticle {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  publishedAt?: Date | null;
}

export interface EpaperPDFOptions {
  issueTitle: string;
  issueDate: Date;
  articles: EpaperArticle[];
  outDir: string;
  fileName?: string; // without extension; derived from issueTitle if omitted
}

export interface EpaperPDFResult {
  filePath: string;
  publicUrl: string;
  pageCount: number;
  fileSize: number;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const C_BLACK      = rgb(0, 0, 0);
const C_WHITE      = rgb(1, 1, 1);
const C_RED        = rgb(0.73, 0.02, 0.02);          // Intambwe brand red
const C_DARK       = rgb(0.11, 0.11, 0.11);           // near-black headlines
const C_DARK_BAR   = rgb(0.14, 0.14, 0.14);           // nav bar bg
const C_GREY_DK    = rgb(0.35, 0.35, 0.35);
const C_GREY_MD    = rgb(0.55, 0.55, 0.55);
const C_GREY_LT    = rgb(0.87, 0.87, 0.87);
const C_GREY_BG    = rgb(0.94, 0.94, 0.94);

// ── Page geometry ─────────────────────────────────────────────────────────────
const PW = 595.28;   // A4 width
const PH = 841.89;   // A4 height
const ML = 28;        // left margin
const MR = 28;        // right margin (mirrored)
const MT = 28;        // top margin
const MB = 36;        // bottom margin (footer)
const CW = PW - ML - MR;

// ── Text helpers ──────────────────────────────────────────────────────────────
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function clip(text: string, font: PDFFont, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let t = text;
  while (t.length && font.widthOfTextAtSize(t + '…', size) > maxW) t = t.slice(0, -1);
  return t + '…';
}

function drawWrapped(
  p: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxW: number,
  leading: number,
  color = C_BLACK,
  maxLines = 99,
): number {
  const lines = wrap(text, font, size, maxW).slice(0, maxLines);
  for (const line of lines) {
    p.drawText(line, { x, y, font, size, color });
    y -= leading;
  }
  return y;
}

function hRule(
  p: PDFPage,
  x: number,
  y: number,
  w: number,
  t = 0.75,
  color = C_BLACK,
) {
  p.drawRectangle({ x, y, width: w, height: t, color });
}

function vRule(
  p: PDFPage,
  x: number,
  yTop: number,
  yBot: number,
  t = 0.5,
  color = C_GREY_LT,
) {
  p.drawRectangle({ x, y: yBot, width: t, height: yTop - yBot, color });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ── Draw masthead (page 1 only) ───────────────────────────────────────────────
function drawMasthead(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  issueDate: Date,
  issueTitle: string,
  issueNumber: string,
): number {
  let y = PH - MT;

  // ── Main header block ─────────────────────────────────────────────────────
  const MAST_H = 74;
  const RIGHT_W = 116;
  const MAIN_W = CW - RIGHT_W;

  // Red left block
  p.drawRectangle({ x: ML, y: y - MAST_H, width: MAIN_W, height: MAST_H, color: C_RED });

  // Newspaper name
  const nameSize = 42;
  p.drawText('INTAMBWE MEDIA', {
    x: ML + 10,
    y: y - nameSize - 4,
    font: fonts.bold,
    size: nameSize,
    color: C_WHITE,
  });

  // Tagline
  const tgl = `"Amakuru y'ukuri — Ubutabera bw'amakuru"`;
  p.drawText(clip(tgl, fonts.italic, 9, MAIN_W - 16), {
    x: ML + 12,
    y: y - nameSize - 20,
    font: fonts.italic,
    size: 9,
    color: rgb(1, 0.82, 0.82),
  });

  // Right box: dark panel with E-GAZETI label
  p.drawRectangle({ x: ML + MAIN_W, y: y - MAST_H, width: RIGHT_W, height: MAST_H, color: C_DARK_BAR });

  // Border line between panels
  p.drawRectangle({ x: ML + MAIN_W, y: y - MAST_H, width: 3, height: MAST_H, color: C_WHITE });

  const egl = 'E-GAZETI';
  const eglW = fonts.bold.widthOfTextAtSize(egl, 20);
  p.drawText(egl, {
    x: ML + MAIN_W + 3 + (RIGHT_W - 3 - eglW) / 2,
    y: y - 30,
    font: fonts.bold,
    size: 20,
    color: C_WHITE,
  });

  const yr = issueDate.getUTCFullYear().toString();
  const yrW = fonts.regular.widthOfTextAtSize(yr, 13);
  p.drawText(yr, {
    x: ML + MAIN_W + 3 + (RIGHT_W - 3 - yrW) / 2,
    y: y - 50,
    font: fonts.regular,
    size: 13,
    color: rgb(0.7, 0.7, 0.7),
  });

  const no = `No. ${issueNumber}`;
  const noW = fonts.bold.widthOfTextAtSize(no, 9.5);
  p.drawText(no, {
    x: ML + MAIN_W + 3 + (RIGHT_W - 3 - noW) / 2,
    y: y - 65,
    font: fonts.bold,
    size: 9.5,
    color: C_RED,
  });

  y -= MAST_H;

  // ── Info bar ──────────────────────────────────────────────────────────────
  const INFO_H = 15;
  p.drawRectangle({ x: ML, y: y - INFO_H, width: CW, height: INFO_H, color: C_DARK_BAR });

  const info = `${fmtDate(issueDate).toUpperCase()}   |   P.O. BOX 1234  KIGALI–RWANDA   |   intambwemedia.com   |   info@intambwemedia.com`;
  p.drawText(clip(info, fonts.regular, 6.5, CW - 8), {
    x: ML + 6,
    y: y - INFO_H + 4,
    font: fonts.regular,
    size: 6.5,
    color: rgb(0.70, 0.70, 0.70),
  });

  y -= INFO_H + 3;
  return y;
}

// ── Category teaser row ───────────────────────────────────────────────────────
function drawTeaserRow(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  articles: EpaperArticle[],
  x: number,
  y: number,
  w: number,
): number {
  const count = Math.min(articles.length, 4);
  if (count === 0) return y;

  const TEASER_H = 64;
  const gap = 10;
  const colW = (w - gap * (count - 1)) / count;

  hRule(p, x, y, w, 1.5, C_RED);
  y -= 3;

  for (let i = 0; i < count; i++) {
    const art = articles[i];
    const cx = x + i * (colW + gap);

    // Category badge
    const cat = art.category.toUpperCase().slice(0, 18);
    const cW = Math.min(fonts.bold.widthOfTextAtSize(cat, 6.5) + 7, colW);
    p.drawRectangle({ x: cx, y: y - 11, width: cW, height: 11, color: C_RED });
    p.drawText(cat, { x: cx + 3, y: y - 9, font: fonts.bold, size: 6.5, color: C_WHITE });

    // Headline
    drawWrapped(p, art.title, fonts.bold, 8.5, cx, y - 24, colW, 12, C_DARK, 2);

    // Excerpt
    drawWrapped(p, art.excerpt, fonts.regular, 7, cx, y - 50, colW, 10, C_GREY_DK, 2);

    // Vertical divider (not after last col)
    if (i < count - 1) {
      vRule(p, cx + colW + gap / 2 - 0.25, y - 1, y - TEASER_H + 4);
    }
  }

  y -= TEASER_H;
  hRule(p, x, y, w, 0.5, C_GREY_LT);
  y -= 8;
  return y;
}

// ── Featured article (wide layout, left body + right image box) ───────────────
function drawFeatured(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  art: EpaperArticle,
  x: number,
  y: number,
  w: number,
  maxH: number,
): number {
  let ty = y;

  // Category badge above headline
  const cat = art.category.toUpperCase().slice(0, 20);
  const cW = fonts.bold.widthOfTextAtSize(cat, 7.5) + 8;
  p.drawRectangle({ x, y: ty - 13, width: cW, height: 13, color: C_RED });
  p.drawText(cat, { x: x + 4, y: ty - 11, font: fonts.bold, size: 7.5, color: C_WHITE });
  ty -= 18;

  // Large headline — spans full width
  const hdSize = 21;
  const hdLeading = 26;
  ty = drawWrapped(p, art.title, fonts.bold, hdSize, x, ty, w, hdLeading, C_DARK, 3);
  ty -= 4;

  hRule(p, x, ty, w * 0.62, 1, C_RED);
  ty -= 12;

  // Author + date byline
  const by = `By ${art.author}${art.publishedAt ? '   ' + fmtShort(art.publishedAt) : ''}`;
  p.drawText(clip(by, fonts.italic, 8, w * 0.62), {
    x,
    y: ty,
    font: fonts.italic,
    size: 8,
    color: C_GREY_MD,
  });
  ty -= 16;

  // Body split: 60% text, 40% image
  const textW = w * 0.60 - 8;
  const imgX = x + w * 0.60 + 4;
  const imgW = w * 0.40 - 4;
  const imgH = Math.min(maxH - (y - ty) - 20, 140);

  // Image placeholder box
  p.drawRectangle({ x: imgX, y: y - maxH + 10, width: imgW, height: imgH, color: C_GREY_BG });
  hRule(p, imgX, y - 18, imgW, 2, C_RED);
  vRule(p, imgX, y - 18, y - 18 - imgH, 1.5, C_RED);
  vRule(p, imgX + imgW - 1.5, y - 18, y - 18 - imgH, 1.5, C_RED);
  hRule(p, imgX, y - 18 - imgH, imgW, 1.5, C_RED);
  const ph = 'PHOTO';
  p.drawText(ph, {
    x: imgX + (imgW - fonts.bold.widthOfTextAtSize(ph, 20)) / 2,
    y: y - 18 - imgH / 2 - 10,
    font: fonts.bold,
    size: 20,
    color: C_GREY_LT,
  });

  // Body text (two narrow sub-columns)
  const half = (textW - 6) / 2;
  const bodyLines = wrap(art.excerpt + ' ' + art.excerpt, fonts.regular, 8.5, half);
  let col1Y = ty;
  for (const line of bodyLines.slice(0, 7)) {
    p.drawText(line, { x, y: col1Y, font: fonts.regular, size: 8.5, color: C_DARK });
    col1Y -= 12;
  }
  let col2Y = ty;
  for (const line of bodyLines.slice(7, 14)) {
    p.drawText(line, { x: x + half + 6, y: col2Y, font: fonts.regular, size: 8.5, color: C_DARK });
    col2Y -= 12;
  }

  // "Continue reading" link
  const kmz = 'KOMEZA KU RUSI ▸';
  const kmzY = Math.min(col1Y, col2Y) - 4;
  p.drawText(kmz, { x, y: kmzY, font: fonts.bold, size: 8, color: C_RED });

  return Math.min(y - maxH, kmzY - 14);
}

// ── Article card (for 3-column grid) ─────────────────────────────────────────
function drawCard(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  art: EpaperArticle,
  x: number,
  y: number,
  w: number,
): number {
  const cat = art.category.toUpperCase().slice(0, 18);
  const cW = Math.min(fonts.bold.widthOfTextAtSize(cat, 6.5) + 7, w);
  p.drawRectangle({ x, y: y - 12, width: cW, height: 12, color: C_RED });
  p.drawText(cat, { x: x + 3, y: y - 10, font: fonts.bold, size: 6.5, color: C_WHITE });
  y -= 16;

  y = drawWrapped(p, art.title, fonts.bold, 10.5, x, y, w, 14, C_DARK, 2);
  y -= 3;
  y = drawWrapped(p, art.excerpt, fonts.regular, 8, x, y, w, 11, C_GREY_DK, 3);
  y -= 3;

  const by = `By ${art.author}${art.publishedAt ? '   ' + fmtShort(art.publishedAt) : ''}`;
  p.drawText(clip(by, fonts.italic, 7.5, w), { x, y, font: fonts.italic, size: 7.5, color: C_GREY_MD });
  y -= 14;

  hRule(p, x, y + 4, w, 0.4, C_GREY_LT);
  return y;
}

// ── Footer bar (every page) ───────────────────────────────────────────────────
function drawFooter(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  pageNum: number,
  issueDate: Date,
  issueTitle: string,
) {
  const BAR_H = 14;
  const barY = MB - 2;
  p.drawRectangle({ x: ML, y: barY, width: CW, height: BAR_H, color: C_DARK_BAR });

  p.drawText('Intambwe Media  |  intambwemedia.com', {
    x: ML + 6,
    y: barY + 3.5,
    font: fonts.regular,
    size: 6.5,
    color: rgb(0.72, 0.72, 0.72),
  });

  const right = `${issueTitle}  |  Page ${pageNum}  |  ${fmtDate(issueDate)}`;
  const rightW = fonts.regular.widthOfTextAtSize(right, 6.5);
  p.drawText(clip(right, fonts.regular, 6.5, CW / 2), {
    x: ML + CW - Math.min(rightW, CW / 2) - 6,
    y: barY + 3.5,
    font: fonts.regular,
    size: 6.5,
    color: rgb(0.72, 0.72, 0.72),
  });
}

// ── Table of contents ─────────────────────────────────────────────────────────
function drawTOC(
  p: PDFPage,
  fonts: Record<string, PDFFont>,
  articles: EpaperArticle[],
  issueTitle: string,
  issueDate: Date,
) {
  p.drawRectangle({ x: ML, y: PH - MT - 36, width: CW, height: 36, color: C_RED });
  p.drawText('IBIKUBIYE  /  TABLE OF CONTENTS', {
    x: ML + 14,
    y: PH - MT - 24,
    font: fonts.bold,
    size: 14,
    color: C_WHITE,
  });
  // Issue title right-aligned in TOC header
  const itW = fonts.italic.widthOfTextAtSize(issueTitle, 8);
  p.drawText(issueTitle, {
    x: ML + CW - itW - 10,
    y: PH - MT - 14,
    font: fonts.italic,
    size: 8,
    color: rgb(1, 0.82, 0.82),
  });

  let y = PH - MT - 52;

  for (let i = 0; i < articles.length; i++) {
    if (y < MB + 26) break;
    const a = articles[i];
    const num = String(i + 1).padStart(2, '0');
    const isEven = i % 2 === 0;

    p.drawRectangle({ x: ML, y: y - 13, width: 20, height: 15, color: isEven ? C_RED : C_DARK_BAR });
    p.drawText(num, { x: ML + 5, y: y - 11, font: fonts.bold, size: 8, color: C_WHITE });

    const catStr = `[${a.category}]`;
    p.drawText(catStr, { x: ML + 26, y: y - 10, font: fonts.bold, size: 8, color: C_GREY_MD });
    const catEnd = ML + 26 + fonts.bold.widthOfTextAtSize(catStr, 8) + 5;

    const titleStr = clip(a.title, fonts.regular, 9, ML + CW - 40 - catEnd);
    p.drawText(titleStr, { x: catEnd, y: y - 10, font: fonts.regular, size: 9, color: C_DARK });

    const pg = `p.${Math.ceil((i + 4) / 4) + 1}`;
    p.drawText(pg, {
      x: ML + CW - fonts.bold.widthOfTextAtSize(pg, 8) - 4,
      y: y - 10,
      font: fonts.bold,
      size: 8,
      color: C_RED,
    });

    if (isEven) {
      p.drawRectangle({ x: ML, y: y - 14, width: CW, height: 16, color: rgb(0.97, 0.97, 0.97) });
      // redraw text over bg
      p.drawRectangle({ x: ML, y: y - 13, width: 20, height: 15, color: C_RED });
      p.drawText(num, { x: ML + 5, y: y - 11, font: fonts.bold, size: 8, color: C_WHITE });
      p.drawText(catStr, { x: ML + 26, y: y - 10, font: fonts.bold, size: 8, color: C_GREY_MD });
      p.drawText(titleStr, { x: catEnd, y: y - 10, font: fonts.regular, size: 9, color: C_DARK });
      p.drawText(pg, {
        x: ML + CW - fonts.bold.widthOfTextAtSize(pg, 8) - 4,
        y: y - 10,
        font: fonts.bold,
        size: 8,
        color: C_RED,
      });
    }

    hRule(p, ML, y - 15, CW, 0.3, C_GREY_LT);
    y -= 18;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateEpaperPDF(opts: EpaperPDFOptions): Promise<EpaperPDFResult> {
  const { issueTitle, issueDate, articles, outDir } = opts;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${issueTitle} | Intambwe Media E-Gazeti`);
  pdfDoc.setAuthor('Intambwe Media');
  pdfDoc.setSubject('Digital Newspaper Edition');
  pdfDoc.setCreator('Intambwe Media PDF Generator');
  pdfDoc.setCreationDate(new Date());

  const fonts = {
    bold:      await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular:   await pdfDoc.embedFont(StandardFonts.Helvetica),
    italic:    await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  // Derive issue number from week-of-year
  const startOfYear = new Date(Date.UTC(issueDate.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((issueDate.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  const issueNumber = String(weekNum).padStart(3, '0');

  const BOTTOM_LIMIT = MB + 22;
  let pageNum = 0;

  const newPage = (): [PDFPage, number] => {
    pageNum += 1;
    const pg = pdfDoc.addPage([PW, PH]);
    drawFooter(pg, fonts, pageNum, issueDate, issueTitle);

    if (pageNum === 1) {
      const y = drawMasthead(pg, fonts, issueDate, issueTitle, issueNumber);
      return [pg, y];
    }

    // Continuation header on pages 2+
    hRule(pg, ML, PH - MT, CW, 2.5, C_RED);
    pg.drawText('INTAMBWE MEDIA', { x: ML, y: PH - MT - 13, font: fonts.bold, size: 9, color: C_RED });
    const dtTxt = fmtDate(issueDate);
    pg.drawText(dtTxt, {
      x: ML + CW - fonts.regular.widthOfTextAtSize(dtTxt, 7.5),
      y: PH - MT - 12,
      font: fonts.regular,
      size: 7.5,
      color: C_GREY_MD,
    });
    hRule(pg, ML, PH - MT - 17, CW, 0.5, C_GREY_LT);
    return [pg, PH - MT - 26];
  };

  // ── Columns helper ──────────────────────────────────────────────────────────
  const NUM_COLS = 3;
  const COL_GAP = 12;
  const colW = (CW - COL_GAP * (NUM_COLS - 1)) / NUM_COLS;
  const colX = (c: number) => ML + c * (colW + COL_GAP);
  const drawColRules = (pg: PDFPage, topY: number) => {
    for (let c = 0; c < NUM_COLS - 1; c++) {
      vRule(pg, colX(c) + colW + COL_GAP / 2 - 0.25, topY, BOTTOM_LIMIT + 4);
    }
  };

  const estCard = (art: EpaperArticle) =>
    16 +
    Math.min(wrap(art.title, fonts.bold, 10.5, colW).length, 2) * 14 +
    Math.min(wrap(art.excerpt, fonts.regular, 8, colW).length, 3) * 11 +
    22;

  // ── Page 1 ─────────────────────────────────────────────────────────────────
  let [page, y] = newPage();
  const artQueue = [...articles];

  // Teasers row (top 4 articles)
  const teasers = artQueue.splice(0, Math.min(4, artQueue.length));
  y = drawTeaserRow(page, fonts, teasers, ML, y, CW);

  // Featured article
  const featured = artQueue.shift();
  if (featured) {
    const featH = Math.min(200, y - BOTTOM_LIMIT - 40);
    if (featH > 90) {
      hRule(page, ML, y, CW, 0.5, C_GREY_LT);
      y -= 6;
      y = drawFeatured(page, fonts, featured, ML, y, CW, featH);
      hRule(page, ML, y + 6, CW, 1, C_GREY_LT);
      y -= 8;
    } else {
      artQueue.unshift(featured); // not enough space; push to grid
    }
  }

  // 3-column grid for remaining articles on page 1
  let colY = [y, y, y];
  let col = 0;
  const gridTopY = y;

  while (artQueue.length > 0 && col < NUM_COLS) {
    const art = artQueue[0];
    if (colY[col] - estCard(art) < BOTTOM_LIMIT) {
      col++;
      continue;
    }
    artQueue.shift();
    colY[col] = drawCard(page, fonts, art, colX(col), colY[col], colW);
  }
  if (gridTopY > y + 10) drawColRules(page, gridTopY);

  // ── Overflow pages ──────────────────────────────────────────────────────────
  while (artQueue.length > 0) {
    [page, y] = newPage();
    colY = [y, y, y];
    col = 0;
    const overflowTopY = y;

    while (artQueue.length > 0) {
      const art = artQueue[0];
      const est = estCard(art);

      // Find a column with enough room
      let placed = false;
      for (let c = col; c < NUM_COLS; c++) {
        if (colY[c] - est >= BOTTOM_LIMIT) {
          artQueue.shift();
          colY[c] = drawCard(page, fonts, art, colX(c), colY[c], colW);
          col = c;
          placed = true;
          break;
        }
      }
      if (!placed) break; // all columns full — next page
    }

    if (overflowTopY > y + 10) drawColRules(page, overflowTopY);
  }

  // ── Table of contents (final page) ─────────────────────────────────────────
  pageNum++;
  const tocPage = pdfDoc.addPage([PW, PH]);
  drawTOC(tocPage, fonts, articles, issueTitle, issueDate);
  drawFooter(tocPage, fonts, pageNum, issueDate, issueTitle);

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = (
    opts.fileName ||
    `${issueTitle}-${issueDate.toISOString().split('T')[0]}`
  )
    .toLowerCase()
    .replace(/[^\w-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const outFile = `${safeName}.pdf`;
  const outPath = path.join(outDir, outFile);

  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(outPath, pdfBytes);

  return {
    filePath: outPath,
    publicUrl: `/uploads/epaper/${outFile}`,
    pageCount: pdfDoc.getPageCount(),
    fileSize: pdfBytes.byteLength,
  };
}
