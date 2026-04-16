/**
 * Test MyMemory with different language codes, especially Kinyarwanda
 */

const testText = "Hello world. This is a test.";

async function testMyMemoryLanguagePair(sourceLang: string, targetLang: string) {
  try {
    const encoded = encodeURIComponent(testText);
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${sourceLang}|${targetLang}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      }
    );

    const data = await response.json();
    
    console.log(`\n${sourceLang} → ${targetLang}:`);
    console.log(`  Status: ${response.status}`);
    
    if (data.responseData?.translatedText) {
      console.log(`  ✓ Result: "${data.responseData.translatedText}"`);
      console.log(`  Match: ${data.responseData.match}`);
    } else {
      console.log(`  ✗ Result:`, data.responseData || 'No data');
    }
  } catch (err) {
    console.log(`\n${sourceLang} → ${targetLang}: ✗ Error:`, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log('Testing MyMemory with different language codes');
  
  // Test supported language pairs
  await testMyMemoryLanguagePair('en', 'sw');  // Should work (tested above)
  await testMyMemoryLanguagePair('rw', 'en');  // Kinyarwanda → English (might not work)
  await testMyMemoryLanguagePair('en', 'rw');  // English → Kinyarwanda (might not work)
  await testMyMemoryLanguagePair('rw', 'sw');  // Kinyarwanda → Kiswahili (might not work)
  
  // Test alternative language codes
  await testMyMemoryLanguagePair('ky', 'en');  // Using 'ky' instead of 'rw'
  await testMyMemoryLanguagePair('en', 'ky');  // Using 'ky' instead of 'rw'
}

main().catch(console.error);
