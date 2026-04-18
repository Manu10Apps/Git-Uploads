#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Analyze & Fix Article Social Media Metadata
 * 
 * PURPOSE:
 * - Identify articles with missing featured images
 * - Ensure image paths normalize correctly
 * - Generate URLs for cache warming
 * - Flag articles needing manual review
 * 
 * USAGE:
 * npx tsx scripts/migrate-article-metadata.ts
 * 
 * OUTPUT:
 * - Console report with statistics
 * - urls-to-warm.txt (list of URLs to warm cache)
 * - articles-needing-review.json (articles with issues)
 */

import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://intambwemedia.com';

interface ArticleAnalysis {
  id: number;
  slug: string;
  title: string;
  image: string | null;
  gallery: string | null;
  createdAt: Date;
}

interface MigrationStats {
  total: number;
  hasFeaturedImage: number;
  needsGalleryFallback: number;
  needsManualReview: number;
  hasProblematicPath: number;
  successfulUrls: string[];
  articlesNeedingReview: ArticleAnalysis[];
  errors: { articleId: number; error: string }[];
}

async function migrateArticleMetadata() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 ARTICLE METADATA MIGRATION SCRIPT');
  console.log('='.repeat(70) + '\n');

  const stats: MigrationStats = {
    total: 0,
    hasFeaturedImage: 0,
    needsGalleryFallback: 0,
    needsManualReview: 0,
    hasProblematicPath: 0,
    successfulUrls: [],
    articlesNeedingReview: [],
    errors: [],
  };

  try {
    // PHASE 1: Fetch all articles
    console.log('📊 PHASE 1: Fetching articles from database...');
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        image: true,
        gallery: true,
        createdAt: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    });

    stats.total = articles.length;
    console.log(`   ✅ Found ${stats.total} articles\n`);

    // PHASE 2: Analyze each article
    console.log('🔍 PHASE 2: Analyzing articles...\n');

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${String(i + 1).padStart(5)}/${stats.total}]`;

      if (article.image) {
        // CASE 1: Has featured image
        const normalized = normalizeArticleImageUrl(article.image);

        if (normalized) {
          stats.hasFeaturedImage++;
          stats.successfulUrls.push(`${SITE_URL}/article/${article.slug}`);

          if ((i + 1) % 100 === 0) {
            console.log(`   ${progress} ✅ ${article.slug} (featured image valid)`);
          }
        } else {
          // Image path cannot normalize
          stats.hasProblematicPath++;
          stats.articlesNeedingReview.push(article);
          console.log(
            `   ${progress} ⚠️  PROBLEMATIC: ${article.slug} - ` +
            `Path cannot normalize: "${article.image}"`
          );
        }
      } else if (article.gallery) {
        // CASE 2: No featured image, check gallery
        try {
          const galleryData = JSON.parse(article.gallery);

          if (Array.isArray(galleryData) && galleryData.length > 0) {
            const firstImage = galleryData[0]?.url;

            if (firstImage && normalizeArticleImageUrl(firstImage)) {
              stats.needsGalleryFallback++;
              stats.successfulUrls.push(`${SITE_URL}/article/${article.slug}`);

              if ((i + 1) % 100 === 0) {
                console.log(
                  `   ${progress} ℹ️  ${article.slug} (using gallery fallback)`
                );
              }
            } else {
              stats.needsManualReview++;
              stats.articlesNeedingReview.push(article);
              console.log(
                `   ${progress} ❌ ${article.slug} - ` +
                `Gallery exists but first image invalid or cannot normalize`
              );
            }
          } else {
            // Gallery exists but is empty
            stats.needsManualReview++;
            stats.articlesNeedingReview.push(article);
            console.log(
              `   ${progress} ❌ ${article.slug} - ` +
              `Gallery exists but is empty`
            );
          }
        } catch (parseErr) {
          stats.errors.push({
            articleId: article.id,
            error: `Failed to parse gallery JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          });
          stats.needsManualReview++;
          stats.articlesNeedingReview.push(article);
          console.log(
            `   ${progress} ❌ ${article.slug} - ` +
            `Gallery JSON parse error`
          );
        }
      } else {
        // CASE 3: No featured image, no gallery
        stats.needsManualReview++;
        stats.articlesNeedingReview.push(article);
        console.log(
          `   ${progress} ❌ ${article.slug} - ` +
          `No featured image or gallery`
        );
      }
    }

    // PHASE 3: Generate reports
    console.log('\n' + '='.repeat(70));
    console.log('📈 MIGRATION STATISTICS');
    console.log('='.repeat(70) + '\n');

    console.log(`Total Articles Analyzed: ${stats.total}`);
    console.log(`  ✅ With valid featured image: ${stats.hasFeaturedImage} (${percent(stats.hasFeaturedImage, stats.total)})`);
    console.log(`  ⚠️  Using gallery fallback: ${stats.needsGalleryFallback} (${percent(stats.needsGalleryFallback, stats.total)})`);
    console.log(`  ❌ Needing manual review: ${stats.needsManualReview} (${percent(stats.needsManualReview, stats.total)})`);
    console.log(`     └─ Problematic paths: ${stats.hasProblematicPath}`);
    console.log(`     └─ Missing images: ${stats.needsManualReview - stats.hasProblematicPath}`);
    console.log(`  ⚠️  Parse errors: ${stats.errors.length}\n`);

    // PHASE 4: Cache warming URLs
    console.log('='.repeat(70));
    console.log('🔥 CACHE WARMING');
    console.log('='.repeat(70) + '\n');

    console.log(`URLs to warm cache: ${stats.successfulUrls.length}`);
    console.log(`Example URLs:`);
    stats.successfulUrls.slice(0, 3).forEach(url => {
      console.log(`  ${url}`);
    });
    if (stats.successfulUrls.length > 3) {
      console.log(`  ... and ${stats.successfulUrls.length - 3} more`);
    }

    const urlsFile = path.join(process.cwd(), 'urls-to-warm.txt');
    fs.writeFileSync(urlsFile, stats.successfulUrls.join('\n'));
    console.log(`\n✅ Saved to: ${urlsFile}\n`);

    // PHASE 5: Articles needing review
    if (stats.articlesNeedingReview.length > 0) {
      console.log('='.repeat(70));
      console.log('🔍 ARTICLES NEEDING MANUAL REVIEW');
      console.log('='.repeat(70) + '\n');

      const displayCount = Math.min(20, stats.articlesNeedingReview.length);
      console.log(`Showing ${displayCount} of ${stats.articlesNeedingReview.length}:\n`);

      console.log('ID      | Slug                                    | Created    | Status');
      console.log('--------|---------------------------------------------|------------|-------');

      stats.articlesNeedingReview.slice(0, displayCount).forEach(a => {
        const id = String(a.id).padEnd(7);
        const slug = (a.slug.substring(0, 43) + (a.slug.length > 43 ? '...' : '')).padEnd(45);
        const created = a.createdAt.toISOString().split('T')[0];
        const status = a.image ? 'Bad path' : a.gallery ? 'Bad gallery' : 'No image';

        console.log(`${id}| ${slug} | ${created} | ${status}`);
      });

      if (stats.articlesNeedingReview.length > 20) {
        console.log(
          `... and ${stats.articlesNeedingReview.length - 20} more articles needing review\n`
        );
      }

      const reviewFile = path.join(process.cwd(), 'articles-needing-review.json');
      fs.writeFileSync(
        reviewFile,
        JSON.stringify(stats.articlesNeedingReview, null, 2)
      );
      console.log(`✅ Detailed list saved to: ${reviewFile}\n`);
    }

    // PHASE 6: Batch cache warming script
    console.log('='.repeat(70));
    console.log('⚡ QUICK CACHE WARMING SCRIPT');
    console.log('='.repeat(70) + '\n');

    console.log('To warm the cache for all articles, run:\n');
    console.log('  bash scripts/warm-social-cache.sh\n');
    console.log('Or manually with curl (requires GNU parallel or xargs):\n');
    console.log('  cat urls-to-warm.txt | xargs -P 10 -I {} curl -s "{}" > /dev/null\n');

    // Create warming script
    const warmScript = `#!/bin/bash
# warm-social-cache.sh
# Warms Next.js ISR cache for all articles

echo "🔥 Warming social metadata cache..."

# Read URLs from file
while IFS= read -r url; do
  echo "  ↪ $url"
  curl -s "$url" > /dev/null
done < urls-to-warm.txt

echo "✅ Cache warming complete!"
echo "Articles will now have fresh metadata for social crawlers"
`;

    const warmScriptPath = path.join(process.cwd(), 'scripts', 'warm-social-cache.sh');
    fs.writeFileSync(warmScriptPath, warmScript);
    fs.chmodSync(warmScriptPath, 0o755);
    console.log(`✅ Created: scripts/warm-social-cache.sh\n`);

    // PHASE 7: Summary recommendations
    console.log('='.repeat(70));
    console.log('✅ NEXT STEPS');
    console.log('='.repeat(70) + '\n');

    if (stats.articlesNeedingReview.length === 0) {
      console.log('🎉 All articles have valid social metadata!\n');
      console.log('NEXT STEPS:');
      console.log('  1. Deploy the fixed code\n');
      console.log('  2. Warm the cache (optional but recommended):\n');
      console.log('     bash scripts/warm-social-cache.sh\n');
      console.log('  3. Refresh social platform caches:\n');
      console.log('     - Facebook: https://developers.facebook.com/tools/debug/sharing/');
      console.log('     - Twitter: https://cards-dev.twitter.com/validator');
      console.log('     - LinkedIn: https://www.linkedin.com/post-inspector/\n');
    } else {
      console.log(`⚠️  ${stats.articlesNeedingReview.length} articles need manual review!\n`);
      console.log('PRIORITY ACTIONS:');
      console.log(`  1. Review articles in: articles-needing-review.json\n`);
      console.log(`  2. Add featured images to the top ${Math.min(10, stats.articlesNeedingReview.length)} articles\n`);
      console.log(`  3. Fix problematic image paths (${stats.hasProblematicPath} articles)\n`);
      console.log(`  4. Deploy code and warm cache:\n`);
      console.log(`     bash scripts/warm-social-cache.sh\n`);
      console.log(`  5. Refresh social platform caches\n`);
    }

    console.log('='.repeat(70) + '\n');
    console.log('✅ Migration analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function percent(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(1)}%`;
}

// Run migration
migrateArticleMetadata().catch(console.error);
