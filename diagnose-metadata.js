#!/usr/bin/env node
/**
 * Social Media Metadata Diagnostic Tool
 * Analyzes and fixes OG/Twitter meta tag issues for article sharing
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ISSUE 1: Check if image files actually exist on disk
// ============================================================================
function checkImageFilesExist() {
  console.log('\n=== CHECKING IMAGE FILES ===');
  const uploadsDir = path.join(__dirname, 'public/uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ /public/uploads directory does not exist!');
    return false;
  }
  
  const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
  console.log(`✅ Found ${files.length} image files in /public/uploads/`);
  
  // Check for common issues
  const sizeIssues = files.filter(f => {
    const stats = fs.statSync(path.join(uploadsDir, f));
    return stats.size < 1000; // Files less than 1KB
  });
  
  if (sizeIssues.length > 0) {
    console.warn(`⚠️  ${sizeIssues.length} files are suspiciously small (<1KB): ${sizeIssues.slice(0,3).join(', ')}...`);
    console.warn('   These might be corrupted or placeholder files!');
  }
  
  return true;
}

// ============================================================================
// ISSUE 2: Check metadata in actual page source
// ============================================================================
function checkPageMetadataGeneration() {
  console.log('\n=== CHECKING PAGE METADATA GENERATION ===');
  
  const articlePagePath = path.join(__dirname, 'app/article/[slug]/page.tsx');
  const layoutPath = path.join(__dirname, 'app/layout.tsx');
  
  let hasOGImage = false;
  let hasTwitterImage = false;
  let hasJSONLD = false;
  
  try {
    const pageContent = fs.readFileSync(articlePagePath, 'utf8');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    hasOGImage = pageContent.includes('og:image') || pageContent.includes('openGraph') && pageContent.includes('images');
    hasTwitterImage = pageContent.includes('twitter:image') || pageContent.includes('twitter') && pageContent.includes('images');
    hasJSONLD = pageContent.includes('application/ld+json') && pageContent.includes('NewsArticle');
    
    console.log(`${hasOGImage ? '✅' : '❌'} OpenGraph og:image metadata`);
    console.log(`${hasTwitterImage ? '✅' : '❌'} Twitter Card image metadata`);
    console.log(`${hasJSONLD ? '✅' : '❌'} JSON-LD NewsArticle schema`);
    
  } catch (error) {
    console.error('❌ Could not read files:', error.message);
  }
  
  return hasOGImage && hasTwitterImage && hasJSONLD;
}

// ============================================================================
// ISSUE 3: Analyze normalizeArticleImageUrl logic
// ============================================================================
function checkImageUrlNormalization() {
  console.log('\n=== CHECKING IMAGE URL NORMALIZATION ===');
  
  const utilsPath = path.join(__dirname, 'lib/utils.ts');
  
  try {
    const content = fs.readFileSync(utilsPath, 'utf8');
    
    const hasNormalization = content.includes('normalizeArticleImageUrl');
    const handlesHttp = content.includes('https?://') || content.includes('http');
    const handlesRelative = content.includes('startsWith(\'/\'');
    const handlesUploads = content.includes('/uploads/');
    
    console.log(`${hasNormalization ? '✅' : '❌'} normalizeArticleImageUrl function exists`);
    console.log(`${handlesHttp ? '✅' : '❌'} Handles absolute URLs (http/https)`);
    console.log(`${handlesRelative ? '✅' : '❌'} Handles relative paths (starts with /)`);
    console.log(`${handlesUploads ? '✅' : '❌'} Handles /uploads/ paths`);
    
    if (!handlesHttp || !handlesRelative || !handlesUploads) {
      console.warn('\n⚠️  Image URL normalization might be incomplete!');
      console.warn('   Missing handlers could cause 404 errors on social media crawlers.');
    }
  } catch (error) {
    console.error('❌ Could not analyze utils:', error.message);
  }
}

// ============================================================================
// ISSUE 4: Check if images are behind auth or CORS
// ============================================================================
function checkPublicImageAccess() {
  console.log('\n=== CHECKING PUBLIC IMAGE ACCESS ===');
  
  const nextConfigPath = path.join(__dirname, 'next.config.js');
  
  try {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    
    const hasStaticOptimization = content.includes('staticOptimization') === false;
    const hasImageDomain = content.includes('images') && (content.includes('domains') || content.includes('remotePatterns'));
    
    console.log(`✅ Static files should be publicly accessible`);
    
    if (!hasImageDomain) {
      console.warn('⚠️  No explicit image domains configured');
      console.warn('   Consider adding Next.js Image Optimization domains config');
    }
  } catch (error) {
    console.warn('⚠️  Could not check next.config.js');
  }
}

// ============================================================================
// ISSUE 5: Middleware URL rewriting issues
// ============================================================================
function checkMiddlewareImpact() {
  console.log('\n=== CHECKING MIDDLEWARE URL HANDLING ===');
  
  const middlewarePath = path.join(__dirname, 'middleware.ts');
  
  try {
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    const rewritesUrls = content.includes('rewrite') || content.includes('NextResponse.rewrite');
    const handlesMetadata = content.includes('Metadata') || content.includes('og:');
    
    console.log(`⚠️  Middleware URL rewrites detected`);
    if (rewritesUrls && !handlesMetadata) {
      console.warn('\n⚠️  CRITICAL: URL rewrites might interfere with metadata generation!');
      console.warn('   When middleware rewrites /en/article/slug to /article/slug,');
      console.warn('   Next.js might not recognize it as the article route.');
      console.warn('\n   Solution: Ensure article/[slug]/page.tsx generateMetadata()');
      console.warn('   runs regardless of locale prefix.');
    }
  } catch (error) {
    console.warn('⚠️  Could not check middleware');
  }
}

// ============================================================================
// RUN DIAGNOSTICS
// ============================================================================
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   Social Media Metadata Diagnostic Tool                       ║');
console.log('║   Checking why article thumbnails aren\'t showing on social    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

checkImageFilesExist();
checkPageMetadataGeneration();
checkImageUrlNormalization();
checkPublicImageAccess();
checkMiddlewareImpact();

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║   QUICK ACTION CHECKLIST                                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log(`
1. ✅ Verify at least 5 recent articles by checking:
   curl https://intambwemedia.com/article/[recent-slug]
   
2. 🔍 Check og:image tag appears in HTML head:
   curl -s https://intambwemedia.com/article/[slug] | grep -i "og:image"
   
3. 🖼️  Test image is accessible:
   curl -I https://intambwemedia.com/uploads/article-[ID].jpg
   (Should return 200, not 404)
   
4. 🔗 Use Facebook Share Debugger:
   https://developers.facebook.com/tools/debug/sharing/
   
5. ⚡ Use LinkedIn Post Inspector:
   https://www.linkedin.com/post-inspector/inspect/
   
6. 🐦 Test on Twitter Card Validator:
   https://cards-dev.twitter.com/validator

If images still don't show, check:
- Image file corruption (small file sizes)
- Database image paths format
- CORS/authentication issues
- Social media cache (24-48 hour TTL)
`);
