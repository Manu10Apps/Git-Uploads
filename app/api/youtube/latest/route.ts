import { NextResponse } from 'next/server';

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
const YOUTUBE_CHANNEL_ID = 'UC9E0Uidq6lnP9PQfK1qQqJw';
const MAX_VIDEOS = 4;

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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
  try {
    const watchResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (watchResponse.ok) {
      const html = await watchResponse.text();
      const watchDurationSeconds = extractDurationSecondsFromWatchHtml(html);
      if (watchDurationSeconds) {
        return formatDuration(watchDurationSeconds);
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
    return infoDurationSeconds ? formatDuration(infoDurationSeconds) : undefined;
  } catch {
    return undefined;
  }
}

function extractChannelId(channelPageHtml: string): string | null {
  const patterns = [
    /"channelId":"(UC[\w-]+)"/,
    /"externalId":"(UC[\w-]+)"/,
    /"browseId":"(UC[\w-]+)"/,
  ];

  for (const pattern of patterns) {
    const match = channelPageHtml.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function resolveChannelId(): Promise<string | null> {
  if (YOUTUBE_CHANNEL_ID) {
    return YOUTUBE_CHANNEL_ID;
  }

  try {
    const channelResponse = await fetch(`https://www.youtube.com/${YOUTUBE_HANDLE}`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (channelResponse.ok) {
      const channelHtml = await channelResponse.text();
      const channelId = extractChannelId(channelHtml);
      if (channelId) return channelId;
    }
  } catch {
    // Fallback to search page below.
  }

  try {
    const searchResponse = await fetch('https://www.youtube.com/results?search_query=intambwemedia', {
      headers: { 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!searchResponse.ok) return null;
    const searchHtml = await searchResponse.text();
    return extractChannelId(searchHtml);
  } catch {
    return null;
  }
}

function parseVideos(feedXml: string): YouTubeVideo[] {
  const entries = feedXml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const videos: YouTubeVideo[] = [];

  for (const entry of entries) {
    if (videos.length >= MAX_VIDEOS) break;

    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!idMatch?.[1]) continue;

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const durationMatch = entry.match(/<yt:duration\s+seconds="(\d+)"\s*\/>/);

    const id = idMatch[1].trim();
    const title = decodeXml((titleMatch?.[1] || 'YouTube Video').trim());

    videos.push({
      id,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      thumbnailFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: durationMatch?.[1] ? formatDuration(Number(durationMatch[1])) : undefined,
      publishedAt: publishedMatch?.[1],
    });
  }

  return videos;
}

export async function GET() {
  try {
    const channelId = await resolveChannelId();

    if (!channelId) {
      return NextResponse.json({ success: false, data: [], error: 'Channel ID not found' }, { status: 502 });
    }

    const feedResponse = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });

    if (!feedResponse.ok) {
      return NextResponse.json({ success: false, data: [], error: 'Failed to fetch videos feed' }, { status: 502 });
    }

    const feedXml = await feedResponse.text();
    const videos = parseVideos(feedXml);
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
