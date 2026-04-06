import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/daily-ai-stories
 * Runs daily at 06:00 UTC.
 *
 * Generates 5 news article drafts in Kinyarwanda using OpenAI:
 *   – 2 Rwanda stories  (politiki + ubukungu)
 *   – 2 East Africa stories (afurika-yiburasirazuba × 2)
 *   – 1 International story (mu-mahanga)
 *
 * Each draft is saved with status "draft" and author "Amakuru24 AI".
 * The job is idempotent: if AI-authored drafts already exist for today it exits early.
 *
 * Security: protected by CRON_SECRET env variable.
 */

const AI_AUTHOR = 'Amakuru24 AI';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface StorySlot {
  categorySlug: string;
  topicHint: string;
  regionTag: string;
}

const STORY_SLOTS: StorySlot[] = [
  {
    categorySlug: 'politiki',
    topicHint: "ibyerekeye politiki n'ubutegetsi mu Rwanda",
    regionTag: 'Rwanda – Politiki',
  },
  {
    categorySlug: 'ubukungu',
    topicHint: "ibyerekeye ubukungu, iterambere no gutunga mu Rwanda",
    regionTag: 'Rwanda – Ubukungu',
  },
  {
    categorySlug: 'afurika-yiburasirazuba',
    topicHint: "ibyerekeye politiki, iterambere cyangwa amakimbirane mu bihugu byo mu Afurika y'Iburasirazuba",
    regionTag: "Afurika y'Iburasirazuba",
  },
  {
    categorySlug: 'afurika-yiburasirazuba',
    topicHint: "ibyerekeye ubucuruzi, ibikorwa remezo, ubuzima, cyangwa gahunda zo gufatanya mu Afurika y'Iburasirazuba",
    regionTag: "Afurika y'Iburasirazuba – Iterambere",
  },
  {
    categorySlug: 'mu-mahanga',
    topicHint: "inkuru ikomeye yo ku isi: politiki mpuzamahanga, ubukungu bw'isi, amakimbirane, cyangwa iterambere ry'ubumenyi",
    regionTag: 'Mpuzamahanga',
  },
];

function toSlug(text: string, suffix: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
  return base ? `${base}-${suffix}` : `ai-story-${suffix}`;
}

async function resolveCategoryId(slug: string, fallbackSlug: string): Promise<number | null> {
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (cat) return cat.id;
  const fallback = await prisma.category.findUnique({ where: { slug: fallbackSlug } });
  return fallback?.id ?? null;
}

interface GeneratedStory {
  title: string;
  excerpt: string;
  content: string;
}

async function generateStory(
  client: OpenAI,
  slot: StorySlot,
  dateLabel: string,
): Promise<GeneratedStory | null> {
  const systemPrompt = `Uri inzobere mu makuru (journalist) ukora ku kinyamakuru AMAKURU24 cy'u Rwanda.
Andika hose mu Kinyarwanda gikwiye, mu nyandiko isobanutse nziza kandi isomeka.
Subiza gusa JSON ikurikira, nta bindi byandiko:
{
  "title": "<umutwe w'inkuru>",
  "excerpt": "<incamake ngufi>",
  "content": "<inkuru yuzuye>"
}`;

  const userPrompt = `Andika inkuru ikomeye ku wa ${dateLabel} yerekeye: ${slot.topicHint}.

Ingingo:
- title: Umutwe w'inkuru mu Kinyarwanda (imirongo 1, amagambo 8–14)
- excerpt: Incamake y'inkuru (amagambo 30–50)
- content: Inkuru yuzuye mu Kinyarwanda (amagambo 400–600), mu buryo bwa inverted pyramid – ingingo z'ingenzi bwa mbere, ibanga, impamvu n'ingaruka, amaherezo

Tekereza inkuru isanzwe n'ibiza mbere mu karere (${slot.regionTag}).
Subiza JSON gusa.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const excerpt = typeof parsed.excerpt === 'string' ? parsed.excerpt.trim() : '';
    const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';

    if (!title || !excerpt || !content) return null;
    return { title, excerpt, content };
  } catch (err) {
    console.error(`[daily-ai-stories] Generation failed for slot "${slot.regionTag}":`, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const auth =
    req.headers.get('authorization') || req.nextUrl.searchParams.get('secret');

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ── OpenAI availability ───────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'OPENAI_API_KEY is not configured.' },
      { status: 503 },
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ── Idempotency: skip if today's batch was already generated ─────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const existingToday = await prisma.article.count({
    where: {
      author: AI_AUTHOR,
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (existingToday >= 5) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: `Daily AI stories already generated today (${existingToday} found).`,
    });
  }

  // ── Resolve category IDs once ─────────────────────────────────────────────
  const categoryCache = new Map<string, number | null>();
  async function getCategoryId(slug: string): Promise<number | null> {
    if (categoryCache.has(slug)) return categoryCache.get(slug)!;
    const id = await resolveCategoryId(slug, 'amakuru');
    categoryCache.set(slug, id);
    return id;
  }

  const dateLabel = new Date().toLocaleDateString('fr-RW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Kigali',
  });
  const slugSuffix = `${new Date().toISOString().slice(0, 10)}`;

  // ── Generate all 5 stories in parallel ───────────────────────────────────
  const results = await Promise.allSettled(
    STORY_SLOTS.map((slot) => generateStory(client, slot, dateLabel)),
  );

  const saved: number[] = [];
  const errors: string[] = [];
  const usedSlugs = new Set<string>();

  for (let i = 0; i < STORY_SLOTS.length; i++) {
    const slot = STORY_SLOTS[i];
    const result = results[i];

    if (result.status === 'rejected' || result.value === null) {
      errors.push(`Slot "${slot.regionTag}": generation failed`);
      continue;
    }

    const story = result.value;
    const categoryId = await getCategoryId(slot.categorySlug);

    if (!categoryId) {
      errors.push(`Slot "${slot.regionTag}": category "${slot.categorySlug}" not found`);
      continue;
    }

    // Build a unique slug: base title slug + date suffix + index if collision
    let slug = toSlug(story.title, `${slugSuffix}-${i + 1}`);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${Date.now()}`;
    }
    usedSlugs.add(slug);

    // Check DB for slug collision and resolve
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const wordCount = story.content.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    try {
      const article = await prisma.article.create({
        data: {
          title: story.title,
          slug,
          excerpt: story.excerpt,
          content: story.content,
          categoryId,
          author: AI_AUTHOR,
          status: 'draft',
          readTime,
          tags: JSON.stringify(['AI', slot.regionTag]),
          featured: false,
        },
      });
      saved.push(article.id);
    } catch (err) {
      console.error(`[daily-ai-stories] DB save failed for slot "${slot.regionTag}":`, err);
      errors.push(`Slot "${slot.regionTag}": failed to save to database`);
    }
  }

  return NextResponse.json({
    success: true,
    saved: saved.length,
    savedIds: saved,
    errors: errors.length > 0 ? errors : undefined,
    date: dateLabel,
  });
}
