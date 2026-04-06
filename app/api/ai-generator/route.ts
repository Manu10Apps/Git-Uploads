import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 });
  }

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
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

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
      return NextResponse.json({ error: 'AI rate limit reached. Please try again shortly.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to generate article. Please try again.' }, { status: 502 });
  }
}
