import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to test each translation service
 * GET /api/admin/translation-diagnostics
 * 
 * Returns a report of which translation services are working/failing
 */
export async function GET(request: NextRequest) {
  const testText = 'Hello, how are you?';
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: MyMemory API
  try {
    console.log('[diagnostics] Testing MyMemory API...');
    const startTime = Date.now();
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(testText)}&langpair=en|sw`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      }
    );
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      results.tests.myMemory = {
        status: 'ok',
        duration: `${duration}ms`,
        response: data?.responseData?.translatedText,
      };
      console.log('[diagnostics] ✓ MyMemory working:', data?.responseData?.translatedText);
    } else {
      results.tests.myMemory = {
        status: 'error',
        statusCode: response.status,
        duration: `${duration}ms`,
        statusText: response.statusText,
      };
      console.warn('[diagnostics] ❌ MyMemory failed with status:', response.status);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.myMemory = {
      status: 'error',
      error: errorMsg,
    };
    console.error('[diagnostics] ❌ MyMemory error:', errorMsg);
  }

  // Test 2: LibreTranslate (first endpoint)
  try {
    console.log('[diagnostics] Testing LibreTranslate...');
    const startTime = Date.now();
    const response = await fetch('https://translate.terraprint.com/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: testText,
        source: 'en',
        target: 'sw',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      results.tests.libretranslate = {
        status: 'ok',
        duration: `${duration}ms`,
        response: data?.translatedText,
      };
      console.log('[diagnostics] ✓ LibreTranslate working:', data?.translatedText);
    } else {
      results.tests.libretranslate = {
        status: 'error',
        statusCode: response.status,
        duration: `${duration}ms`,
        statusText: response.statusText,
      };
      console.warn('[diagnostics] ❌ LibreTranslate failed with status:', response.status);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.libretranslate = {
      status: 'error',
      error: errorMsg,
    };
    console.error('[diagnostics] ❌ LibreTranslate error:', errorMsg);
  }

  // Test 3: Network connectivity (ping google.com to verify internet)
  try {
    console.log('[diagnostics] Testing internet connectivity...');
    const startTime = Date.now();
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    const duration = Date.now() - startTime;
    
    results.tests.internetConnectivity = {
      status: 'ok',
      duration: `${duration}ms`,
      statusCode: response.status,
    };
    console.log('[diagnostics] ✓ Internet connectivity OK (Google responds with', response.status, ')');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.internetConnectivity = {
      status: 'error',
      error: errorMsg,
    };
    console.error('[diagnostics] ❌ Internet connectivity error:', errorMsg);
  }

  // Test 4: DNS resolution
  try {
    console.log('[diagnostics] Testing DNS resolution...');
    const response = await fetch('https://api.mymemory.translated.net/');
    results.tests.dnsResolution = {
      status: 'ok',
    };
    console.log('[diagnostics] ✓ DNS resolution OK');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.dnsResolution = {
      status: 'error',
      error: errorMsg,
    };
    console.error('[diagnostics] ❌ DNS resolution error:', errorMsg);
  }

  // Summary
  const allOk = Object.values(results.tests).every((t: any) => t.status === 'ok');
  results.summary = {
    overallStatus: allOk ? 'all-services-ok' : 'some-services-failed',
    workingServices: Object.entries(results.tests)
      .filter(([, test]: [string, any]) => test.status === 'ok')
      .map(([name]) => name),
    failedServices: Object.entries(results.tests)
      .filter(([, test]: [string, any]) => test.status !== 'ok')
      .map(([name]) => name),
  };

  console.log('[diagnostics] Final report:', {
    overallStatus: results.summary.overallStatus,
    workingServices: results.summary.workingServices,
    failedServices: results.summary.failedServices,
  });

  return NextResponse.json(results);
}
