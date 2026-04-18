import { NextResponse } from 'next/server';
import { convertYouTubeTimeToKinyarwanda } from '@/lib/utils';

type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  thumbnailFallback: string;
  duration?: string;
  publishedAt?: string;
};

const YOUTUBE_HANDLE = '@intambwemedia';
const MAX_VIDEOS = 4;
const YOUTUBE_CACHE_TTL_MS = 10 * 60 * 1000;
const DURATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CHANNEL_PAGE_CANDIDATES = [
  `https://www.youtube.com/${YOUTUBE_HANDLE}/videos`,
  `https://www.youtube.com/${YOUTUBE_HANDLE}/streams`,
  `https://www.youtube.com/${YOUTUBE_HANDLE}`,
  'https://www.youtube.com/results?search_query=intambwemedia',
];

let latestVideosCache: { expiresAt: number; data: YouTubeVideo[] } | null = null;
const durationCache = new Map<string, { expiresAt: number; duration?: string }>();

type YouTubeRendererText = {
  simpleText?: string;
  runs?: Array<{ text?: string }>;
};

type YouTubeThumbnail = {
  url?: string;
};

type YouTubeVideoRenderer = {
  videoId?: string;
  title?: YouTubeRendererText;
  publishedTimeText?: YouTubeRendererText;
  lengthText?: YouTubeRendererText;
  thumbnail?: { thumbnails?: YouTubeThumbnail[] };
};

function isLiveOrPremiereSignal(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const text = value.toLowerCase();
  return (
    text.includes('streamed live')
    || text.includes('watching now')
    || text.includes('live now')
    || text.includes('en direct')
    || text.includes('premiered')
    || text.includes('premiering')
    || text.includes('premiere')
    || text.includes('premiering now')
    || text.includes('premiering in')
    || text === 'live'
    || text === 'direct'
  );
}

function hasExplicitLiveOrPremiereBadge(contextText: string | undefined): boolean {
  if (!contextText) {
    return false;
  }

  return (
    /"badgeStyle":"BADGE_STYLE_TYPE_LIVE_NOW"/.test(contextText)
    || /"badgeStyle":"BADGE_STYLE_TYPE_PREMIERE"/.test(contextText)
    || /"style":"LIVE"/.test(contextText)
    || /"style":"PREMIERE"/.test(contextText)
    || /"iconType":"LIVE"/.test(contextText)
    || /"iconType":"PREMIERE"/.test(contextText)
    || /"label":"LIVE"/.test(contextText)
    || /"label":"PREMIERE"/.test(contextText)
    || /"thumbnailOverlayTimeStatusRenderer"\s*:\s*\{[^}]*"style":"LIVE"/.test(contextText)
    || /"thumbnailOverlayTimeStatusRenderer"\s*:\s*\{[^}]*"style":"PREMIERE"/.test(contextText)
    || /"upcomingEventData"\s*:\s*\{/.test(contextText)
    || /"scheduledStartTime"\s*:/.test(contextText)
    || /"isUpcoming"\s*:\s*true/.test(contextText)
    || /"isLiveNow"\s*:\s*true/.test(contextText)
    || /"isLive"\s*:\s*true/.test(contextText)
    || /"isPremiere"\s*:\s*true/.test(contextText)
    || /"liveNow"\s*:\s*true/.test(contextText)
  );
}

function resolveDisplayPublishedAt(rawPublishedAt: string | undefined, contextText?: string, rawDuration?: string): string | undefined {
  if (
    isLiveOrPremiereSignal(rawPublishedAt)
    || hasExplicitLiveOrPremiereBadge(contextText)
    || rawDuration?.toLowerCase() === 'live'
  ) {
    return '[LIVE]Live';
  }

  const converted = convertYouTubeTimeToKinyarwanda(rawPublishedAt);
  return converted || undefined;
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeJsonText(text: string): string {
  return text
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u002f/g, '/')
    .replace(/\\n/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .trim();
}

function getRendererText(value?: YouTubeRendererText): string {
  if (!value) {
    return '';
  }

  if (value.simpleText) {
    return value.simpleText.trim();
  }

  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => run.text || '').join('').trim();
  }

  return '';
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function extractDurationSecondsFromWatchHtml(html: string): number | undefined {
  const patterns = [
    /"lengthSeconds":"(\d+)"/,
    /"approxDurationMs":"(\d+)"/,
    /lengthSeconds\\":\\"(\d+)\\"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    const rawValue = Number(match[1]);
    if (!Number.isFinite(rawValue) || rawValue <= 0) continue;

    if (pattern.source.includes('approxDurationMs')) {
      return Math.floor(rawValue / 1000);
    }

    return rawValue;
  }

  return undefined;
}

function extractDurationSecondsFromVideoInfo(videoInfoBody: string): number | undefined {
  const params = new URLSearchParams(videoInfoBody);

  const directLength = params.get('length_seconds');
  if (directLength) {
    const parsed = Number(directLength);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const playerResponse = params.get('player_response');
  if (!playerResponse) {
    return undefined;
  }

  try {
    const parsedResponse = JSON.parse(playerResponse) as {
      videoDetails?: { lengthSeconds?: string };
      microformat?: { playerMicroformatRenderer?: { lengthSeconds?: string } };
    };

    const lengthSeconds = parsedResponse.videoDetails?.lengthSeconds
      || parsedResponse.microformat?.playerMicroformatRenderer?.lengthSeconds;

    if (!lengthSeconds) {
      return undefined;
    }

    const parsed = Number(lengthSeconds);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function resolveVideoDuration(videoId: string): Promise<string | undefined> {
  const cachedDuration = durationCache.get(videoId);
  if (cachedDuration && cachedDuration.expiresAt > Date.now()) {
    return cachedDuration.duration;
  }

  try {
    const watchResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (watchResponse.ok) {
      const html = await watchResponse.text();
      const watchDurationSeconds = extractDurationSecondsFromWatchHtml(html);
      if (watchDurationSeconds) {
        const duration = formatDuration(watchDurationSeconds);
        durationCache.set(videoId, { expiresAt: Date.now() + DURATION_CACHE_TTL_MS, duration });
        return duration;
      }
    }

    const infoResponse = await fetch(
      `https://www.youtube.com/get_video_info?video_id=${videoId}&el=detailpage&hl=en`,
      {
        headers: { 'user-agent': 'Mozilla/5.0' },
        cache: 'no-store',
      }
    );

    if (!infoResponse.ok) {
      return undefined;
    }

    const infoBody = await infoResponse.text();
    const infoDurationSeconds = extractDurationSecondsFromVideoInfo(infoBody);
    const duration = infoDurationSeconds ? formatDuration(infoDurationSeconds) : undefined;
    durationCache.set(videoId, { expiresAt: Date.now() + DURATION_CACHE_TTL_MS, duration });
    return duration;
  } catch {
    return undefined;
  }
}

function extractInitialData(html: string): unknown | null {
  const markers = [
    'var ytInitialData = ',
    'window["ytInitialData"] = ',
    'ytInitialData = ',
  ];

  let markerIndex = -1;
  let markerLength = 0;

  for (const marker of markers) {
    const currentIndex = html.indexOf(marker);
    if (currentIndex !== -1) {
      markerIndex = currentIndex;
      markerLength = marker.length;
      break;
    }
  }

  if (markerIndex === -1) {
    return null;
  }

  const jsonStart = html.indexOf('{', markerIndex + markerLength);
  if (jsonStart === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const character = html[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === '\\') {
      isEscaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        const rawJson = html.slice(jsonStart, index + 1);

        try {
          return JSON.parse(rawJson);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function collectVideoRenderers(node: unknown, renderers: YouTubeVideoRenderer[] = []): YouTubeVideoRenderer[] {
  if (!node || typeof node !== 'object') {
    return renderers;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectVideoRenderers(item, renderers);
    }

    return renderers;
  }

  const record = node as Record<string, unknown>;
  const videoRenderer = record.videoRenderer as YouTubeVideoRenderer | undefined;

  if (videoRenderer?.videoId) {
    renderers.push(videoRenderer);
  }

  for (const value of Object.values(record)) {
    collectVideoRenderers(value, renderers);
  }

  return renderers;
}

function parseVideosFromChannelPage(html: string): YouTubeVideo[] {
  const initialData = extractInitialData(html);
  if (!initialData) {
    return [];
  }

  const renderers = collectVideoRenderers(initialData);
  const seenIds = new Set<string>();
  const videos: YouTubeVideo[] = [];

  for (const renderer of renderers) {
    const id = renderer.videoId?.trim();
    if (!id || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    const thumbnailCandidates = renderer.thumbnail?.thumbnails || [];
    const thumbnail = thumbnailCandidates[thumbnailCandidates.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const title = decodeXml(getRendererText(renderer.title) || 'YouTube Video');
    const rawPublishedAt = getRendererText(renderer.publishedTimeText) || undefined;
    const rendererContext = JSON.stringify(renderer);
    const rawDuration = getRendererText(renderer.lengthText) || undefined;
    const publishedAt = resolveDisplayPublishedAt(rawPublishedAt, rendererContext, rawDuration);
    const isLive = publishedAt === '[LIVE]Live';
    const duration = isLive ? undefined : rawDuration;

    videos.push({
      id,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail,
      thumbnailFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration,
      publishedAt,
    });

    if (videos.length >= MAX_VIDEOS) {
      break;
    }
  }

  return videos;
}

function extractValueFromSnippet(snippet: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match?.[1]) {
      return decodeXml(decodeJsonText(match[1]));
    }
  }

  return undefined;
}

function parseVideosFromHtmlFallback(html: string): YouTubeVideo[] {
  const idMatches = Array.from(html.matchAll(/"videoId":"([\w-]{11})"/g));
  const seenIds = new Set<string>();
  const videos: YouTubeVideo[] = [];

  for (const match of idMatches) {
    const id = match[1]?.trim();
    const index = match.index ?? -1;

    if (!id || index === -1 || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    const snippetStart = Math.max(0, index - 300);
    const snippetEnd = Math.min(html.length, index + 3500);
    const snippet = html.slice(snippetStart, snippetEnd);

    const title = extractValueFromSnippet(snippet, [
      /"title":\{"runs":\[\{"text":"([\s\S]*?)"\}\]/,
      /"title":\{"simpleText":"([\s\S]*?)"\}/,
      /"headline":\{"simpleText":"([\s\S]*?)"\}/,
    ]) || 'YouTube Video';

    const rawPublishedAt = extractValueFromSnippet(snippet, [
      /"publishedTimeText":\{"simpleText":"([\s\S]*?)"\}/,
      /"publishedTimeText":\{"runs":\[\{"text":"([\s\S]*?)"\}\]/,
    ]);

    const publishedAt = resolveDisplayPublishedAt(rawPublishedAt, snippet);

    const duration = extractValueFromSnippet(snippet, [
      /"lengthText":\{"simpleText":"([\s\S]*?)"\}/,
      /"lengthText":\{[\s\S]*?"label":"([\s\S]*?)"\}/,
    ]);

    const rawThumbnail = extractValueFromSnippet(snippet, [
      new RegExp(`(https://i\\.ytimg\\.com/vi/${id}/hqdefault\\.jpg[^"\\s]*)`),
      new RegExp(`(https://img\\.youtube\\.com/vi/${id}/hqdefault\\.jpg[^"\\s]*)`),
    ]);

    videos.push({
      id,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: rawThumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      thumbnailFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration,
      publishedAt,
    });

    if (videos.length >= MAX_VIDEOS) {
      break;
    }
  }

  return videos;
}

async function fetchLatestVideos(): Promise<YouTubeVideo[]> {
  for (const url of CHANNEL_PAGE_CANDIDATES) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const structuredVideos = parseVideosFromChannelPage(html);
      if (structuredVideos.length > 0) {
        return structuredVideos;
      }

      const fallbackVideos = parseVideosFromHtmlFallback(html);
      if (fallbackVideos.length > 0) {
        return fallbackVideos;
      }
    } catch {
      // Try the next public page candidate.
    }
  }

  return [];
}

export async function GET() {
  try {
    if (latestVideosCache && latestVideosCache.expiresAt > Date.now()) {
      return NextResponse.json(
        { success: true, data: latestVideosCache.data },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    const videos = await fetchLatestVideos();

    if (videos.length === 0) {
      return NextResponse.json({ success: false, data: [], error: 'Failed to parse latest videos' }, { status: 502 });
    }

    const videosWithDuration = await Promise.all(
      videos.map(async (video) => {
        if (video.duration) {
          return video;
        }

        const resolvedDuration = await resolveVideoDuration(video.id);
        return {
          ...video,
          duration: resolvedDuration,
        };
      })
    );

    latestVideosCache = {
      expiresAt: Date.now() + YOUTUBE_CACHE_TTL_MS,
      data: videosWithDuration,
    };

    return NextResponse.json(
      { success: true, data: videosWithDuration },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch YouTube latest videos:', error);
    return NextResponse.json({ success: false, data: [], error: 'Failed to fetch latest videos' }, { status: 500 });
  }
}
