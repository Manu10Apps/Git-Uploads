import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import { verifyToken } from '@/lib/auth';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory rate limiter: max 5 requests per IP per 60 seconds
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipWindowMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const entry = ipWindowMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    ipWindowMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSecs: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSecs: 0 };
}

async function createCompletionWithRetry(
  client: OpenAI,
  params: Parameters<OpenAI['chat']['completions']['create']>[0],
  maxRetries = 3,
) {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(params);
    } catch (err: any) {
      lastError = err;
      if (err?.status === 429) {
        // Honour Retry-After header if present, otherwise use exponential backoff
        const retryAfter = Number(err?.headers?.['retry-after'] ?? 0);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt + 1) * 1000;
        if (attempt < maxRetries - 1) {
          await sleep(waitMs);
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  // Skip rate limiting for authenticated admins
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isAuthenticatedAdmin = token ? verifyToken(token) !== null : false;

  if (!isAuthenticatedAdmin) {
    // Rate limiting for unauthenticated requests
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateCheck.retryAfterSecs}s before trying again.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSecs) },
        },
      );
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  let body: { title?: string; topic?: string; tone?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { title, topic, tone = 'journalistic', language = 'en' } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Article title is required.' }, { status: 400 });
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'Article topic is required.' }, { status: 400 });
  }

  const languageName =
    language === 'ky' ? 'Kinyarwanda' : language === 'sw' ? 'Swahili' : 'English';

  const systemPrompt = `You are a professional news journalist at AMAKURU24, an East African news outlet.
Write authoritative, factual, and well-structured news articles.
Always write in ${languageName} with a ${tone} tone.
Use the inverted pyramid structure: most important facts first.
Do not include any preamble, commentary, or metadata — return only the article body in plain text markdown.`;

  const userPrompt = `Write a news article with the following details:

Title: ${title.trim()}
Topic/Context: ${topic.trim()}

Requirements:
- 400–600 words
- Clear news structure: lead paragraph, key facts, context, quotes (if relevant), conclusion
- Factual, readable, and publication-ready
- Return plain text markdown only (no JSON, no headings for "Article:", just the body content)`;

  try {
    const completion = await createCompletionWithRetry(client, {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }) as ChatCompletion;

    const content = completion.choices[0]?.message?.content?.trim() ?? '';

    if (!content) {
      return NextResponse.json({ error: 'AI returned empty content. Please try again.' }, { status: 502 });
    }

    const plainText = content.replace(/[#*_`]/g, '');
    const excerpt = plainText.substring(0, 180).trim() + (plainText.length > 180 ? '...' : '');
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    return NextResponse.json({ content, excerpt, readTime, language });
  } catch (err: any) {
    console.error('[ai-generator] OpenAI error:', err);
    if (err?.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key.' }, { status: 502 });
    }
    if (err?.status === 429) {
      const retryAfter = Number(err?.headers?.['retry-after'] ?? 60);
      return NextResponse.json(
        { error: `AI service is temporarily busy. Please try again in ${retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
    return NextResponse.json({ error: 'Failed to generate article. Please try again.' }, { status: 502 });
  }
}
