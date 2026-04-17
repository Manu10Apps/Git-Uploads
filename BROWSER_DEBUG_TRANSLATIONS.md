/\*\*

- Browser Console Debugging Guide for Translation Failures
-
- Copy and paste these commands in your browser's developer console
- (F12 or Right-click > Inspect > Console tab)
  \*/

// ============================================================================
// 1. Test if the API endpoint is reachable
// ============================================================================

async function testTranslateAPI() {
console.log('🔍 Testing /api/translations/translate-article...');
try {
const response = await fetch('/api/translations/translate-article', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
title: 'Test Title',
excerpt: 'Test excerpt for translation',
content: 'This is test content that will be translated.',
to: 'en',
from: 'ky',
}),
});

    console.log('Status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Response:', data);

    if (response.ok) {
      console.log('✅ Endpoint is reachable and working!');
    } else {
      console.log('❌ Endpoint returned error:', data.error);
    }
    return data;

} catch (error) {
console.error('❌ Network error:', error);
}
}

// Run with: testTranslateAPI()

// ============================================================================
// 2. Test cache endpoint
// ============================================================================

async function testCacheAPI(articleId = 1) {
console.log(`🔍 Testing /api/translations/cache with articleId=${articleId}...`);
try {
const response = await fetch(`/api/translations/cache?articleId=${articleId}&lang=en`);
console.log('Status:', response.status);
const data = await response.json();
console.log('Response:', data);

    if (data.data) {
      console.log('✅ Translation found in cache');
    } else {
      console.log('ℹ️  No translation in cache yet');
    }
    return data;

} catch (error) {
console.error('❌ Network error:', error);
}
}

// Run with: testCacheAPI(1)

// ============================================================================
// 3. Monitor translation requests from the article panel
// ============================================================================

// Add this to monitor all fetch requests in the page
const originalFetch = window.fetch;
window.fetch = function(...args) {
const [resource, config] = args;
if (resource.includes('/api/translations')) {
console.log('📤 API Request:', {
url: resource,
method: config?.method || 'GET',
timestamp: new Date().toISOString(),
});

    return originalFetch.apply(this, args)
      .then(response => {
        console.log('📥 API Response:', {
          url: resource,
          status: response.status,
          timestamp: new Date().toISOString(),
        });
        return response;
      })
      .catch(error => {
        console.error('❌ API Error:', {
          url: resource,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        throw error;
      });

}
return originalFetch.apply(this, args);
};

console.log('✅ API monitoring enabled. Check console for translation requests.');

// ============================================================================
// 4. Check Network tab
// ============================================================================

/\*
To properly debug API failures:

1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Click the "Auto-Translate & Save All Languages" button
5. Watch for these requests:
   - /api/translations/translate-article (should be POST)
   - /api/translations/cache (should be POST)

For each request, check:
✓ Status Code: 200 (success), 400 (invalid input), 429 (rate limit), 500 (server error)
✓ Response: Look at Response tab to see error message
✓ Timing: How long did it take?

Common issues:

- 429: Rate limited - wait a moment and try again
- 400: Invalid data being sent - check form inputs
- 500: Server error - check server logs
- Network timeout: Server taking too long
  \*/

// ============================================================================
// 5. Check article form data
// ============================================================================

function getFormData() {
console.log('📋 Current form data:');
// This will depend on your admin panel structure
// Adjust the selectors based on your HTML
const title = document.querySelector('input[name="title"]')?.value || 'NOT FOUND';
const excerpt = document.querySelector('textarea[name="excerpt"]')?.value || 'NOT FOUND';
const content = document.querySelector('textarea[name="content"]')?.value || 'NOT FOUND';

console.log({
titleLength: title.length,
excerptLength: excerpt.length,
contentLength: content.length,
hasContent: {
title: !!title && title !== 'NOT FOUND',
excerpt: !!excerpt && excerpt !== 'NOT FOUND',
content: !!content && content !== 'NOT FOUND',
},
});
}

// Run with: getFormData()

// ============================================================================
// 6. Quick status check
// ============================================================================

async function quickCheck() {
console.log('🔎 Running quick health check...\n');

// Test translate endpoint
const translateTest = await fetch('/api/translations/translate-article', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
title: 'Test', excerpt: 'Test', content: 'Test', to: 'en'
}),
}).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ error: e.message }));

// Test cache endpoint
const cacheTest = await fetch('/api/translations/cache?articleId=1&lang=en')
.then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ error: e.message }));

console.log('Translate API:', translateTest);
console.log('Cache API:', cacheTest);

const allOk = (translateTest.ok || translateTest.status === 400) && (cacheTest.ok || cacheTest.status === 404);
if (allOk) {
console.log('\n✅ All endpoints are reachable!');
} else {
console.log('\n❌ Some endpoints are not reachable');
}
}

// Run with: quickCheck()
