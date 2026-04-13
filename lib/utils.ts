export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatKinyarwandaDateTime(dateInput?: string | Date | null): {
  dateLabel: string;
  timeLabel: string;
} {
  const fallback = {
    dateLabel: 'N/A',
    timeLabel: 'Nonaha',
  };

  if (!dateInput) {
    return fallback;
  }

  const parsedDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  const kinyarwandaMonths = [
    'Mutarama',
    'Gashyantare',
    'Werurwe',
    'Mata',
    'Gicurasi',
    'Kamena',
    'Nyakanga',
    'Kanama',
    'Nzeri',
    'Ukwakira',
    'Ugushyingo',
    'Ukuboza',
  ];

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const monthIndex = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  let timeAgoLabel = 'Nonaha';
  if (diffMinutes >= 5 && diffMinutes < 60) {
    timeAgoLabel = `Hashize Iminota ${diffMinutes}`;
  } else if (diffMinutes >= 60) {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      timeAgoLabel = diffHours === 1 ? 'Hashize Isaha 1' : `Hashize Amasaha ${diffHours}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) {
        timeAgoLabel = diffDays === 1 ? 'Hashize Umunsi 1' : `Hashize Iminsi ${diffDays}`;
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) {
          timeAgoLabel = diffMonths === 1 ? 'Hashize Ukwezi 1' : `Hashize Amezi ${diffMonths}`;
        } else {
          const diffYears = Math.floor(diffDays / 365);
          timeAgoLabel = diffYears === 1 ? 'Hashize Umwaka 1' : `Hashize Imyaka ${diffYears}`;
        }
      }
    }
  }

  return {
    dateLabel: `${day} ${kinyarwandaMonths[monthIndex]} ${year}`,
    timeLabel: timeAgoLabel,
  };
}

export function formatLocalizedDateTime(
  dateInput: string | Date | null | undefined,
  t: { timeAgo: Record<string, string>; months: string[] }
): { dateLabel: string; timeLabel: string } {
  const fallback = { dateLabel: 'N/A', timeLabel: t.timeAgo.now };
  if (!dateInput) return fallback;

  const parsedDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) return fallback;

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const monthIndex = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  let timeLabel = t.timeAgo.now;
  if (diffMinutes >= 5 && diffMinutes < 60) {
    timeLabel = t.timeAgo.minutesAgo.replace('{n}', String(diffMinutes));
  } else if (diffMinutes >= 60) {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      timeLabel = diffHours === 1 ? t.timeAgo.hourAgo : t.timeAgo.hoursAgo.replace('{n}', String(diffHours));
    } else {
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) {
        timeLabel = diffDays === 1 ? t.timeAgo.dayAgo : t.timeAgo.daysAgo.replace('{n}', String(diffDays));
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) {
          timeLabel = diffMonths === 1 ? t.timeAgo.monthAgo : t.timeAgo.monthsAgo.replace('{n}', String(diffMonths));
        } else {
          const diffYears = Math.floor(diffDays / 365);
          timeLabel = diffYears === 1 ? t.timeAgo.yearAgo : t.timeAgo.yearsAgo.replace('{n}', String(diffYears));
        }
      }
    }
  }

  return {
    dateLabel: `${day} ${t.months[monthIndex]} ${year}`,
    timeLabel,
  };
}

export function formatCategoryLabel(category?: string | null): string {
  if (!category) return 'GENERAL';
  const trimmed = category.trim();
  if (!trimmed) return 'GENERAL';
  return trimmed.toUpperCase();
}

export function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    politics: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
    business: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
    technology: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
    investigations: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200',
    culture: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
    sports: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
  };
  return colors[category] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200';
}

export function normalizeArticleImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    return null;
  }

  const normalizedSlashes = trimmedUrl.replace(/\\/g, '/');

  if (normalizedSlashes.startsWith('data:') || normalizedSlashes.startsWith('blob:')) {
    return normalizedSlashes;
  }

  if (/^file:/i.test(normalizedSlashes)) {
    return null;
  }

  if (/^[a-zA-Z]:\//.test(normalizedSlashes)) {
    const uploadsMatch = normalizedSlashes.match(/(?:^|\/)public\/uploads\/(.+)$/i);
    if (uploadsMatch?.[1]) {
      return `/uploads/${uploadsMatch[1]}`;
    }

    return null;
  }

  if (normalizedSlashes.startsWith('//')) {
    return `https:${normalizedSlashes}`;
  }

  const toUploadsPathFromAnyPath = (inputPath: string): string | null => {
    const sanitizedPath = inputPath.split('?')[0]?.split('#')[0] || inputPath;
    const pathMatch = sanitizedPath.match(/(?:^|\/)(?:public\/)?uploads\/(.+)$/i);
    if (!pathMatch?.[1]) {
      return null;
    }

    const relativeUploadPath = pathMatch[1].replace(/^\/+/, '');
    return relativeUploadPath ? `/uploads/${relativeUploadPath}` : null;
  };

  const normalizeUploadPath = (pathValue: string) => {
    if (pathValue.startsWith('/public/uploads/')) {
      return pathValue.replace('/public/uploads/', '/uploads/');
    }

    if (pathValue.startsWith('public/uploads/')) {
      return `/${pathValue.replace(/^public\//, '')}`;
    }

    if (pathValue.startsWith('./uploads/')) {
      return `/${pathValue.replace(/^\.\//, '')}`;
    }

    if (pathValue.startsWith('/admin/uploads/')) {
      return pathValue.replace('/admin/uploads/', '/uploads/');
    }

    if (pathValue.startsWith('admin/uploads/')) {
      return `/${pathValue.replace(/^admin\//, '')}`;
    }

    if (pathValue.startsWith('uploads/')) {
      return `/${pathValue}`;
    }

    if (pathValue.startsWith('/uploads/')) {
      return pathValue;
    }

    return pathValue;
  };

  if (/^https?:\/\//i.test(normalizedSlashes)) {
    try {
      const parsedUrl = new URL(normalizedSlashes);
      const embeddedUploadsFromUrl = toUploadsPathFromAnyPath(parsedUrl.pathname);
      parsedUrl.pathname = embeddedUploadsFromUrl || normalizeUploadPath(parsedUrl.pathname);
      return parsedUrl.toString();
    } catch {
      return normalizedSlashes;
    }
  }

  const embeddedUploadPath = toUploadsPathFromAnyPath(normalizedSlashes);
  if (embeddedUploadPath) {
    return embeddedUploadPath;
  }

  // CRITICAL FIX: Handle simple filename format (e.g., "article-123-xyz.jpeg")
  // This is the most common storage format from image uploads
  if (/^[^/\\]+\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(normalizedSlashes)) {
    const resolved = `/uploads/${normalizedSlashes}`;
    return resolved;
  }

  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(normalizedSlashes)) {
    return `https://${normalizedSlashes}`;
  }

  const normalizedPath = normalizeUploadPath(normalizedSlashes);
  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  if (/^[^/]+\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(normalizedPath)) {
    return `/uploads/${normalizedPath}`;
  }

  return `/${normalizedPath}`;
}

export function convertYouTubeTimeToKinyarwanda(timeText: string | undefined): string {
  if (!timeText) return '';

  const text = timeText.toLowerCase().trim();

  // Live streams and premieres should display as a red "Live" label.
  if (
    text.includes('direct') ||
    text.includes('live') ||
    text.includes('en direct') ||
    text.includes('premier')
  ) {
    return '[LIVE]Live';
  }

  // Under one minute should show as "Nonaha".
  if (text.includes('just now') || text.includes('instant') || text.includes('second')) {
    return 'Nonaha';
  }

  // Extract number from French or English text
  const numberMatch = text.match(/(\d+)/);
  if (!numberMatch) return timeText;

  const number = parseInt(numberMatch[1], 10);

  // Convert French time text (handle "il y a X j/h/m" format)
  if (text.includes('year') || text.includes('an') || text.match(/\d+\s*a(?:\s|$)/)) {
    return number === 1 ? 'Hashize umwaka umwe' : `Hashize imyaka ${number}`;
  }

  if (text.includes('mois') || text.includes('month') || text.match(/\d+\s*(?:mois|mo)(?:\s|$)/)) {
    return number === 1 ? 'Hashize ukwezi kumwe' : `Hashize amezi ${number}`;
  }

  if (text.includes('semaine') || text.includes('week') || text.match(/\d+\s*(?:sem|w)(?:\s|$)/)) {
    return number === 1 ? 'Hashize icyumweru kimwe' : `Hashize ibyumweru ${number}`;
  }

  if (text.includes('jour') || text.includes('day') || text.match(/\d+\s*[jd](?:\s|$)/)) {
    return number === 1 ? 'Hashize umunsi umwe' : `Hashize iminsi ${number}`;
  }

  if (text.includes('heure') || text.includes('hour') || text.match(/\d+\s*h(?:\s|$)/)) {
    return number === 1 ? 'Hashize isaha' : `Hashize amasaha ${number}`;
  }

  if (text.includes('minute') || text.includes('m') || text.match(/\d+\s*m(?:in)?(?:\s|$)/)) {
    return number === 1 ? 'Hashize umunota' : `Hashize iminota ${number}`;
  }

  return timeText;
}

/**
 * Gets the URL of the first live YouTube video available
 * Returns the URL string if a live video exists, null otherwise
 * Live videos are identified by the [LIVE] marker in publishedAt field
 */
export async function getLiveYouTubeVideoUrl(): Promise<string | null> {
  try {
    const response = await fetch('/api/youtube/latest', {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[LIVE] API response not ok:', response.status);
      return null;
    }

    const result = (await response.json()) as { success?: boolean; data?: Array<{ publishedAt?: string; title?: string; url?: string }> };
    const videos = result.data || [];

    console.log('[LIVE] YouTube videos fetched:', videos.length, 'videos');
    console.log('[LIVE] Video details:', videos.map((v) => ({ title: v.title, publishedAt: v.publishedAt })));

    const liveVideo = videos.find((video) => video.publishedAt?.startsWith('[LIVE]'));

    if (liveVideo?.url) {
      console.log('[LIVE] Found live video:', liveVideo.title, '- URL:', liveVideo.url);
      return liveVideo.url;
    }

    console.log('[LIVE] No live videos found');
    return null;
  } catch (error) {
    console.error('[LIVE] Error checking live video status:', error);
    return null;
  }
}
