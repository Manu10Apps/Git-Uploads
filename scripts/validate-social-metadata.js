#!/usr/bin/env node

/**
 * Social Media Metadata Validator
 * Tests article pages for correct OG/Twitter meta tags
 * 
 * Usage:
 *   node scripts/validate-social-metadata.js https://intambwemedia.com/article/article-slug
 *   node scripts/validate-social-metadata.js --recent 5      # Test 5 most recent articles
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractMetaTags(html) {
  const tags = {};
  
  // Extract og:* tags
  const ogRegex = /<meta\s+property="(og:[^"]+)"\s+content="([^"]*)"/g;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    tags[match[1]] = match[2];
  }
  
  // Extract twitter:* tags
  const twitterRegex = /<meta\s+name="(twitter:[^"]+)"\s+content="([^"]*)"/g;
  while ((match = twitterRegex.exec(html)) !== null) {
    tags[match[1]] = match[2];
  }
  
  // Extract canonical
  const canonicalRegex = /<link\s+rel="canonical"\s+href="([^"]*)"/;
  const canonicalMatch = canonicalRegex.exec(html);
  if (canonicalMatch) tags['canonical'] = canonicalMatch[1];
  
  return tags;
}

function validateMetadata(url, tags) {
  const results = {
    url,
    valid: true,
    checks: [],
  };
  
  const checks = [
    {
      name: 'og:type',
      expected: 'article',
      validate: () => tags['og:type'] === 'article',
    },
    {
      name: 'og:title',
      validate: () => !!tags['og:title'] && tags['og:title'].length > 0,
      error: 'og:title is missing or empty',
    },
    {
      name: 'og:description',
      validate: () => {
        const desc = tags['og:description'];
        return !!desc && desc.length > 0 && desc.length <= 160;
      },
      error: 'og:description missing, empty, or > 160 chars',
    },
    {
      name: 'og:image',
      validate: () => {
        const img = tags['og:image'];
        return !!img && 
               img.startsWith('https://') && 
               /\.(jpg|jpeg|png|webp|gif)$/i.test(img);
      },
      error: 'og:image missing, not absolute URL, or invalid format',
    },
    {
      name: 'og:image:width',
      expected: '1200',
      validate: () => tags['og:image:width'] === '1200',
    },
    {
      name: 'og:image:height',
      expected: '630',
      validate: () => tags['og:image:height'] === '630',
    },
    {
      name: 'og:image:type',
      validate: () => /image\/(jpeg|png|webp|gif)/.test(tags['og:image:type'] || ''),
      error: 'og:image:type missing or invalid',
    },
    {
      name: 'og:url',
      validate: () => {
        const ogUrl = tags['og:url'];
        return !!ogUrl && ogUrl.startsWith('https://intambwemedia.com/article/');
      },
      error: 'og:url missing or doesn\'t start with correct domain',
    },
    {
      name: 'twitter:card',
      expected: 'summary_large_image',
      validate: () => tags['twitter:card'] === 'summary_large_image',
    },
    {
      name: 'twitter:image',
      validate: () => {
        const img = tags['twitter:image'];
        return !!img && 
               img.startsWith('https://') && 
               /\.(jpg|jpeg|png|webp|gif)$/i.test(img);
      },
      error: 'twitter:image missing or invalid',
    },
    {
      name: 'twitter:title',
      validate: () => !!tags['twitter:title'] && tags['twitter:title'].length > 0,
      error: 'twitter:title missing or empty',
    },
    {
      name: 'twitter:description',
      validate: () => {
        const desc = tags['twitter:description'];
        return !!desc && desc.length > 0 && desc.length <= 160;
      },
      error: 'twitter:description missing, empty, or > 160 chars',
    },
    {
      name: 'canonical',
      validate: () => {
        const canonical = tags['canonical'];
        return !!canonical && canonical.startsWith('https://intambwemedia.com/');
      },
      error: 'canonical URL missing or incorrect',
    },
  ];
  
  checks.forEach(check => {
    const passed = check.validate();
    results.checks.push({
      name: check.name,
      passed,
      actual: tags[check.name] || '(not found)',
      expected: check.expected,
      error: !passed ? check.error : null,
    });
    if (!passed) results.valid = false;
  });
  
  return results;
}

function displayResults(results) {
  log(`\n📝 Article: ${results.url}`, 'blue');
  log('─'.repeat(80));
  
  const passed = results.checks.filter(c => c.passed).length;
  const total = results.checks.length;
  
  results.checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    
    log(`${icon} ${check.name.padEnd(30)}`, color);
    
    if (!check.passed) {
      log(`   └─ Error: ${check.error}`, 'yellow');
      log(`   └─ Actual: ${check.actual}`, 'gray');
      if (check.expected) log(`   └─ Expected: ${check.expected}`, 'gray');
    }
  });
  
  log('─'.repeat(80));
  const statusColor = results.valid ? 'green' : 'red';
  log(`Result: ${passed}/${total} checks passed`, statusColor);
  
  return results.valid;
}

async function validateUrl(url) {
  try {
    log(`\n🔍 Fetching: ${url}`, 'blue');
    const html = await fetchUrl(url);
    const tags = extractMetaTags(html);
    const results = validateMetadata(url, tags);
    return displayResults(results);
  } catch (error) {
    log(`❌ Error fetching ${url}: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Social Media Metadata Validator', 'blue');
    log('─'.repeat(80));
    log('Usage:', 'yellow');
    log('  Validate single article:');
    log('    node scripts/validate-social-metadata.js https://intambwemedia.com/article/slug\n');
    log('  Validate multiple URLs from input:');
    log('    node scripts/validate-social-metadata.js --urls urls.txt\n');
    log('  Validate from database (requires Prisma):');
    log('    node scripts/validate-social-metadata.js --database 10\n');
    log('─'.repeat(80));
    return;
  }
  
  let urls = [];
  
  if (args[0] === '--urls' && args[1]) {
    // Read from file
    const filePath = path.resolve(args[1]);
    const content = fs.readFileSync(filePath, 'utf-8');
    urls = content.split('\n').filter(line => line.trim().startsWith('https://'));
  } else if (args[0] === '--database' && args[1]) {
    // Would need Prisma setup - for now just guide user
    log('Database validation not implemented. Use --urls with file instead.', 'yellow');
    return;
  } else {
    // Direct URL arguments
    urls = args.filter(arg => arg.startsWith('https://'));
  }
  
  if (urls.length === 0) {
    log('❌ No valid URLs provided', 'red');
    return;
  }
  
  let allValid = true;
  for (const url of urls) {
    const isValid = await validateUrl(url);
    if (!isValid) allValid = false;
  }
  
  log('\n' + '='.repeat(80));
  if (allValid) {
    log('✅ All validations passed!', 'green');
    process.exit(0);
  } else {
    log('❌ Some validations failed. Review errors above.', 'red');
    process.exit(1);
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
