/**
 * Diagnostic script to test translation services from production environment
 * Run with: npx ts-node diagnose-translations.ts
 */

async function diagnoseLibreTranslate() {
  console.log('\n=== Testing LibreTranslate ===');
  
  const endpoints = [
    'https://libretranslate.de/translate',
    'https://api.libretranslate.de/translate',
    'https://libretranslate.com/translate',
    'https://translate.terraprint.com/translate',
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'Hello world',
          source: 'en',
          target: 'sw',
          format: 'text',
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      console.log(`  Status: ${response.status}`);
      const text = await response.text();
      console.log(`  Response (first 200 chars): ${text.substring(0, 200)}`);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function diagnoseMyMemory() {
  console.log('\n=== Testing MyMemory ===');
  
  try {
    console.log('Testing: api.mymemory.translated.net');
    const response = await fetch(
      'https://api.mymemory.translated.net/get?q=Hello&langpair=en|sw',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      }
    );
    
    console.log(`  Status: ${response.status}`);
    const data = await response.json();
    console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}`);
  } catch (err) {
    console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function diagnosePuter() {
  console.log('\n=== Testing Puter ===');
  
  try {
    console.log('Testing: api.puter.com/ai/chat');
    const response = await fetch('https://api.puter.com/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a translator. Translate to Swahili.' },
          { role: 'user', content: 'Hello world' },
        ],
        model: 'gpt-3.5-turbo',
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response (first 200 chars): ${text.substring(0, 200)}`);
  } catch (err) {
    console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function testKinyarwandaSupport() {
  console.log('\n=== Testing Kinyarwanda Support ===');
  
  console.log('\nLibreTranslate with rw code:');
  try {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'Muraho',
        source: 'rw',
        target: 'en',
        format: 'text',
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text.substring(0, 300)}`);
  } catch (err) {
    console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log('Translation Service Diagnostics - ' + new Date().toISOString());
  
  await diagnoseLibreTranslate();
  await diagnoseMyMemory();
  await diagnosePuter();
  await testKinyarwandaSupport();
  
  console.log('\n=== Diagnostics Complete ===');
}

main().catch(console.error);
