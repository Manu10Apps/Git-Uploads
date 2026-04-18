/**
 * GET /api/translations/health
 * Check availability of translation services
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Test LibreTranslate endpoints
  const libreEndpoints = [
    'https://libretranslate.de/translate',
    'https://api.libretranslate.de/translate',
    'https://libretranslate.com/translate',
  ];

  for (const endpoint of libreEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'test',
          source: 'en',
          target: 'sw',
          format: 'text',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      results.services[`libretranslate-${endpoint.split('/')[2]}`] = {
        status: response.status,
        ok: response.ok,
      };
    } catch (err) {
      results.services[`libretranslate-${endpoint.split('/')[2]}`] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Test MyMemory
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      'https://api.mymemory.translated.net/get?q=test&langpair=en|sw',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    results.services.mymemory = {
      status: response.status,
      ok: response.ok,
    };
  } catch (err) {
    results.services.mymemory = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test Puter
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://api.puter.com/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a translator.' },
          { role: 'user', content: 'Hello' },
        ],
        model: 'gpt-3.5-turbo',
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    results.services.puter = {
      status: response.status,
      ok: response.ok,
    };
  } catch (err) {
    results.services.puter = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(results);
}
