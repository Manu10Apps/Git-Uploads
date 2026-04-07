import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/daily-ai-stories
 * Runs every hour.
 *
 * Generates 1 news article draft in Kinyarwanda using OpenAI per run.
 * The slot is selected by rotating through STORY_SLOTS based on the current hour.
 *
 * Each draft is saved with status "draft" and author "Amakuru24 AI".
 * The job is idempotent: skips if an AI draft was already created in the last hour.
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

  // ── Idempotency: skip if an AI draft was already created in the last hour ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.article.count({
    where: { author: AI_AUTHOR, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= 1) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: `AI story already generated in the last hour (${recentCount} found).`,
    });
  }

  // ── Pick one slot by rotating on current UTC hour ─────────────────────────
  const currentHour = new Date().getUTCHours();
  const slot = STORY_SLOTS[currentHour % STORY_SLOTS.length];

  const dateLabel = new Date().toLocaleDateString('fr-RW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Kigali',
  });
  const slugSuffix = `${new Date().toISOString().slice(0, 13).replace('T', '-h')}`;

  // ── Generate 1 story ──────────────────────────────────────────────────────
  const story = await generateStory(client, slot, dateLabel);
  if (story === null) {
    return NextResponse.json(
      { success: false, error: `Generation failed for slot "${slot.regionTag}"` },
      { status: 502 },
    );
  }

  const categoryId = await resolveCategoryId(slot.categorySlug, 'amakuru');
  if (!categoryId) {
    return NextResponse.json(
      { success: false, error: `Category "${slot.categorySlug}" not found` },
      { status: 500 },
    );
  }

  let slug = toSlug(story.title, slugSuffix);
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

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
    return NextResponse.json({
      success: true,
      saved: 1,
      savedId: article.id,
      slot: slot.regionTag,
      date: dateLabel,
    });
  } catch (err) {
    console.error(`[daily-ai-stories] DB save failed for slot "${slot.regionTag}":`, err);
    return NextResponse.json(
      { success: false, error: 'Failed to save article to database' },
      { status: 500 },
    );
  }
}
