/**
 * Diagnostic tool to test translation services availability
 * Run with: npx ts-node test-translation-services.ts
 */

const testText = "Hello world. This is a test.";

async function testLibreTranslate() {
  console.log('\n=== Testing LibreTranslate ===');
  const endpoints = [
    'https://translate.terraprint.com/translate',
    'https://api.libretranslate.de/translate',
    'https://libretranslate.de/translate',
    'https://libretranslate.com/translate',
    'https://libretranslate.nyc/translate',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: testText,
          source: 'en',
          target: 'sw',
          format: 'text',
        }),
        signal: AbortSignal.timeout(10000),
      });

      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${contentType}`);
      
      if (response.ok && contentType?.includes('application/json')) {
        const data = JSON.parse(text);
        console.log(`  ✓ Translation: ${data.translatedText || 'No translation'}`);
      } else {
        console.log(`  ✗ Response: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function testMyMemory() {
  console.log('\n=== Testing MyMemory ===');
  try {
    console.log(`Testing: https://api.mymemory.translated.net/get`);
    const encoded = encodeURIComponent(testText);
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|sw`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      }
    );

    console.log(`  Status: ${response.status}`);
    const data = await response.json();
    
    if (data.responseData?.translatedText) {
      console.log(`  ✓ Translation: ${data.responseData.translatedText}`);
    } else {
      console.log(`  ✗ Response: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function testPuter() {
  console.log('\n=== Testing Puter ===');
  try {
    console.log(`Testing: https://api.puter.com/ai/chat`);
    const response = await fetch('https://api.puter.com/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `Translate this to Kiswahili: "${testText}"\n\nRespond with ONLY the translation, nothing else.`,
          },
        ],
        model: 'gpt-4o-mini',
      }),
      signal: AbortSignal.timeout(10000),
    });

    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    
    if (response.ok) {
      console.log(`  ✓ Response received`);
      console.log(`  Content preview: ${text.substring(0, 100)}`);
    } else {
      console.log(`  ✗ Response: ${text.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log('Testing Translation Services Availability');
  console.log('Test text:', testText);
  
  await testLibreTranslate();
  await testMyMemory();
  await testPuter();
  
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
