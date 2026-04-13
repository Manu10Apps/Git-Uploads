/**
 * Internal Linking Helper
 * Generates optimal internal linking suggestions for SEO improvement
 * Helps with crawlability, PageRank distribution, and semantic relationships
 */

interface ArticleForLinking {
  id: number;
  slug: string;
  title: string;
  categorySlug?: string;
  categoryName?: string;
  publishedAt?: Date;
}

interface InternalLinkSuggestion {
  targetSlug: string;
  targetTitle: string;
  anchorText: string;
  reason: 'same-category' | 'related-topic' | 'investigation' | 'breaking';
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generate internal link suggestions for an article
 * Should link to 2-4 relevant articles for SEO value
 */
export function generateInternalLinkSuggestions(
  currentArticle: ArticleForLinking,
  relatedArticles: ArticleForLinking[],
  breakingNews: ArticleForLinking[] = [],
  investigativeStories: ArticleForLinking[] = []
): InternalLinkSuggestion[] {
  const suggestions: InternalLinkSuggestion[] = [];

  // 1. Link to same category articles (highest priority)
  const sameCategoryArticles = relatedArticles.filter(
    (a) =>
      a.categorySlug === currentArticle.categorySlug &&
      a.id !== currentArticle.id
  );

  sameCategoryArticles.slice(0, 2).forEach((article) => {
    suggestions.push({
      targetSlug: article.slug,
      targetTitle: article.title,
      anchorText: article.title,
      reason: 'same-category',
      priority: 'high',
    });
  });

  // 2. Link to investigations if relevant (medium-high priority)
  if (currentArticle.categoryName?.toLowerCase().includes('politics') ||
      currentArticle.categoryName?.toLowerCase().includes('business')) {
    const investigations = investigativeStories.slice(0, 1);
    investigations.forEach((article) => {
      suggestions.push({
        targetSlug: article.slug,
        targetTitle: article.title,
        anchorText: `Read our investigation: ${article.title}`,
        reason: 'investigation',
        priority: 'high',
      });
    });
  }

  // 3. Link to breaking news if very recent (medium priority)
  const recentBreakingNews = breakingNews.filter(
    (a) =>
      a.id !== currentArticle.id &&
      a.publishedAt &&
      new Date(a.publishedAt).getTime() > new Date().getTime() - 24 * 60 * 60 * 1000 // Last 24 hours
  );

  if (recentBreakingNews.length > 0 && suggestions.length < 4) {
    suggestions.push({
      targetSlug: recentBreakingNews[0].slug,
      targetTitle: recentBreakingNews[0].title,
      anchorText: 'See latest breaking news',
      reason: 'breaking',
      priority: 'medium',
    });
  }

  // 4. Link to category page (medium priority)
  if (currentArticle.categorySlug && suggestions.length < 4) {
    suggestions.push({
      targetSlug: `category/${currentArticle.categorySlug}`,
      targetTitle: currentArticle.categoryName || 'More Articles',
      anchorText: `More ${currentArticle.categoryName?.toLowerCase() || 'news'} articles`,
      reason: 'related-topic',
      priority: 'medium',
    });
  }

  return suggestions.slice(0, 4); // Max 4 internal links per article
}

/**
 * Best practices for internal linking in articles:
 *
 * 1. ANCHOR TEXT: Should be descriptive and contain keywords
 *    ❌ Don't: "Click here", "Read more", "Related"
 *    ✅ Do: "Rwanda government announces new education policy", specific keywords
 *
 * 2. LINK PLACEMENT: Embed naturally in content
 *    ❌ Don't: Append links to end of article
 *    ✅ Do: Link within relevant sentences/paragraphs
 *
 * 3. LINK QUANTITY: 2-4 internal links per article optimal
 *    ❌ Don't: 10+ links (dilutes PageRank)
 *    ✅ Do: 2-4 carefully chosen relevant links
 *
 * 4. LINK DISTRIBUTION: Mix different link types
 *    - Same category (most relevant)
 *    - Investigation (if applicable)
 *    - Breaking news (if recent)
 *    - Category page (for navigation)
 *
 * 5. CANONICAL LINKS: Always include for non-canonical versions
 *    - Multi-language versions should use hreflang
 *    - Duplicate content should use canonical tag
 */

export const INTERNAL_LINKING_BEST_PRACTICES = {
  maxLinksPerArticle: 4,
  descriptionAdvisory:
    'Use descriptive anchor text with keywords for SEO value',
  placementAdvisory:
    'Embed links naturally within content, not as footers',
  targetAdvisory:
    'Link to highest-value pages within same category first',
};
