import { prisma } from './prisma';

/**
 * Get current E-Paper edition
 */
export async function getCurrentEpaperEdition() {
  try {
    // First try the edition explicitly marked as current
    const current = await prisma.epaperEdition.findFirst({
      where: {
        isCurrent: true,
        isArchived: false,
        status: 'published',
        pdfUrl: { not: null },
      },
      include: {
        admin: { select: { id: true, name: true } },
      },
    });
    if (current) return current;

    // Fall back to the most recently published edition
    return await prisma.epaperEdition.findFirst({
      where: {
        isArchived: false,
        status: 'published',
        pdfUrl: { not: null },
      },
      orderBy: { issueDate: 'desc' },
      include: {
        admin: { select: { id: true, name: true } },
      },
    });
  } catch (error: any) {
    // Silently handle table-not-found and DB-unreachable errors (e.g. at build time)
    if (error?.code === 'P1025' || error?.code === 'P1001' || error?.message?.includes('does not exist')) {
      return null;
    }
    console.error('Error fetching current epaper:', error);
    return null;
  }
}

/**
 * Get all active E-Paper editions (not archived)
 */
export async function getActiveEpaperEditions(limit = 10) {
  try {
    return await prisma.epaperEdition.findMany({
      where: { isArchived: false, status: 'published', pdfUrl: { not: null } },
      orderBy: { issueDate: 'desc' },
      take: limit,
      include: {
        admin: { select: { id: true, name: true } },
      },
    });
  } catch (error: any) {
    // Silently handle table-not-found and DB-unreachable errors (e.g. at build time)
    if (error?.code === 'P1025' || error?.code === 'P1001' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching active epaper editions:', error);
    return [];
  }
}

/**
 * Get archived E-Paper editions
 */
export async function getArchivedEpaperEditions(limit = 100) {
  try {
    return await prisma.epaperEdition.findMany({
      where: { isArchived: true },
      orderBy: { issueDate: 'desc' },
      take: limit,
      include: {
        admin: { select: { id: true, name: true } },
      },
    });
  } catch (error: any) {
    // Silently handle table-not-found and DB-unreachable errors (e.g. at build time)
    if (error?.code === 'P1025' || error?.code === 'P1001' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching archived epaper editions:', error);
    return [];
  }
}

/**
 * Mark all editions older than 4 weeks as archived
 */
export async function autoArchiveOldEditions() {
  try {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const archived = await prisma.epaperEdition.updateMany({
      where: {
        isArchived: false,
        issueDate: { lt: fourWeeksAgo },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    console.log(`Auto-archived ${archived.count} old epaper editions`);
    return archived.count;
  } catch (error) {
    console.error('Error auto-archiving editions:', error);
    return 0;
  }
}

/**
 * Get formatted issue date
 */
export function formatIssueDate(date: Date, locale: string = 'en') {
  const formatter = new Intl.DateTimeFormat(locale === 'ky' ? 'rw' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(new Date(date));
}

/**
 * Validate PDF file
 */
export function isValidPdfFile(file: File): boolean {
  return file.type === 'application/pdf' && file.size > 0;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
