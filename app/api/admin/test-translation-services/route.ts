import { NextRequest, NextResponse } from 'next/server';
import { isValidLanguage } from '@/lib/translation-service';

/**
 * GET /api/admin/test-translation-services
 * Test each translation service independently
 * Useful for diagnosing translation API failures
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testText = searchParams.get('text') || 'Hello, how are you today?';
    const fromLang = (searchParams.get('from') || 'en') as any;
    const toLang = (searchParams.get('to') || 'ky') as any;

    if (!isValidLanguage(fromLang) || !isValidLanguage(toLang)) {
      return NextResponse.json(
        { error: 'Invalid language. Supported: ky, en, sw' },
        { status: 400 }
      );
    }

    console.log('[test-translation-services] Testing translation services:', {
      text: testText.substring(0, 50),
      from: fromLang,
      to: toLang,
    });

    const results = {
      timestamp: new Date().toISOString(),
      testText,
      from: fromLang,
      to: toLang,
      services: {} as Record<string, any>,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextPublicUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      },
    };

    // Test MyMemory
    console.log('[test-translation-services] Testing MyMemory...');
    try {
      const start = Date.now();
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(testText)}&langpair=en|ky`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        }
      );
      const duration = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        results.services.mymemory = {
          status: 'success',
          duration,
          response: data.responseData?.translatedText?.substring(0, 100) || 'No translation',
        };
        console.log('[test-translation-services] MyMemory OK:', duration, 'ms');
      } else {
        results.services.mymemory = {
          status: 'error',
          duration,
          httpStatus: response.status,
          error: await response.text().then(t => t.substring(0, 200)),
        };
        console.error('[test-translation-services] MyMemory failed:', response.status);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.services.mymemory = {
        status: 'error',
        error: errorMsg,
      };
      console.error('[test-translation-services] MyMemory exception:', errorMsg);
    }

    // Test LibreTranslate
    console.log('[test-translation-services] Testing LibreTranslate...');
    try {
      const start = Date.now();
      const response = await fetch('https://api.libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: testText,
          source: 'en',
          target: 'rw',
          format: 'text',
        }),
        signal: AbortSignal.timeout(10000),
      });
      const duration = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        results.services.libretranslate = {
          status: 'success',
          duration,
          response: data.translatedText?.substring(0, 100) || 'No translation',
        };
        console.log('[test-translation-services] LibreTranslate OK:', duration, 'ms');
      } else {
        const text = await response.text();
        results.services.libretranslate = {
          status: 'error',
          duration,
          httpStatus: response.status,
          error: text.substring(0, 200),
        };
        console.error('[test-translation-services] LibreTranslate failed:', response.status);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.services.libretranslate = {
        status: 'error',
        error: errorMsg,
      };
      console.error('[test-translation-services] LibreTranslate exception:', errorMsg);
    }

    // Test network connectivity
    console.log('[test-translation-services] Testing network connectivity...');
    try {
      const start = Date.now();
      const response = await fetch('https://www.google.com', {
        signal: AbortSignal.timeout(5000),
      });
      const duration = Date.now() - start;
      results.services.networkConnectivity = {
        status: response.ok ? 'success' : 'error',
        duration,
        httpStatus: response.status,
      };
      console.log('[test-translation-services] Network OK:', duration, 'ms');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.services.networkConnectivity = {
        status: 'error',
        error: errorMsg,
      };
      console.error('[test-translation-services] Network error:', errorMsg);
    }

    console.log('[test-translation-services] Test complete:', results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[test-translation-services] Test failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Test failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
