'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { Header, NewsCard, Footer } from '@/app/components';

export default function CategoryPage({ params: paramsPromise }: { params: Promise<{ category: string }> }) {
  const params = React.use(paramsPromise);
  const { language } = useAppStore();
  const t = getTranslation(language);
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<any[]>([]);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState('latest');
  const articlesPerPage = 9;

  const categoryTitles: Record<string, string> = {
    amakuru: 'Amakuru',
    politiki: 'Politiki',
    ubuzima: 'Ubuzima',
    uburezi: 'Uburezi',
    ubukungu: 'Ubukungu',
    siporo: 'Siporo',
    ikoranabuhanga: 'Ikoranabuhanga',
    imyidagaduro: 'Imyidagaduro',
    ubutabera: 'Ubutabera',
    ibidukikije: 'Ibidukikije',
    iyobokamana: 'Siporo',
    imyemerere: 'Imyemerere',
    'afurika-yiburasirazuba': 'Afurika y\'Iburasirazuba',
    'mu-mahanga': 'Mu Mahanga',
  };

  const categoryDescription: Record<string, string> = {
    amakuru: 'Amakuru agezweho buri gihe na buri munsi',
    politiki: 'Inkuru n\'ibiganiro kuri politiki z\'ibihugu n\'imicungire yabyo',
    ubuzima: 'Inkuru, ibiganiro n\'ubushakashatsi ku muntu n\'imibereho ye',
    uburezi: 'Inkuru zivuga ku burezi, uko amasomo atangwa n\'ireme ryayo mu kuzahura ubukungu',
    ubukungu: 'Inkuru z\'ibikorwa bitandukanye biteza imbere ubukungu n\'imicungire yabwo',
    siporo: 'Inkuru zivuga ku Imikino itandukanye',
    ikoranabuhanga: 'Inkuru n\'ibiganiro by\'ikoranabuhanga n\'uruhare rwaryo mu iterambere',
    imyidagaduro: 'Ibiganiro n\'inkuru, Imyidagaduro, Imyambarire n\'ibindi bireba ibyishimo by\'abantu',
    ubutabera: 'Amakuru n\'ibiganiro birebana n\'uburenganzira bwa muntu n\'amategeko',
    ibidukikije: 'Inkuru n\'ibiganiro birebana n\'ibidukikije, isi n\'Ibiyikorerwaho birimo Ubuhinzi n\'Ubworozi',
    iyobokamana: 'Inkuru zivuga ku Imikino itandukanye',
    imyemerere: 'Inkuru n\'ibiganiro birebana n\'imanudi n\'imyemerere y\'ikiristo',
    'afurika-yiburasirazuba': 'Amakuru acukumbuye yerekeranye n\'Afurika y\'Iburasirazuba',
    'mu-mahanga': 'Amakuru yose yo hanze ya Afurika y\'Iburasirazuba',
  };

  // Fetch articles from API
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/articles?category=${params.category}`);
        const data = await response.json();
        const fetchedArticles = data.data || [];
        setAllArticles(fetchedArticles);
        setArticles(fetchedArticles);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
        setAllArticles([]);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [params.category]);

  // Sort articles when sort option changes
  useEffect(() => {
    let sorted = [...allArticles];
    
    switch (sortOption) {
      case 'latest':
        // Already sorted by latest from API
        break;
      case 'popular':
        // Sort by a popularity metric (you can customize this)
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'discussed':
        // Sort by comments/engagement (you can customize this)
        sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        break;
      default:
        break;
    }
    
    setArticles(sorted);
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [sortOption, allArticles]);

  // Calculate pagination
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = articles.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Category Header */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl md:text-2xl font-bold mb-0.5">
              {categoryTitles[params.category] || 'Category'}
            </h1>
            <p className="text-xs text-primary-100">
              {categoryDescription[params.category] || 'Latest stories in this category.'}
            </p>
          </div>
        </section>

        {/* Filters & Sorting */}
        <section className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Showing {currentArticles.length} of {articles.length} articles
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs sm:text-sm font-medium whitespace-nowrap">Kurikiranya:</label>
                <select 
                  value={sortOption}
                  onChange={handleSortChange}
                  className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm cursor-pointer"
                >
                  <option value="latest">Iziheruka</option>
                  <option value="popular">Izasomwe cyane</option>
                  <option value="discussed">Izavuzweho cyane</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gufunguka...</p>
              </div>
            ) : currentArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {currentArticles.map((article) => (
                  <NewsCard key={article.id} {...article} sources={[]} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Nta nkuru zibonetse muri iki gice.
                </p>
              </div>
            )}

            {/* Pagination */}
            {!loading && articles.length > articlesPerPage && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button 
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← {t.common.previous}
                </button>
                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? goToPage(page) : null}
                      disabled={page === '...'}
                      className={`px-3 py-2 rounded transition-colors ${
                        page === currentPage
                          ? 'bg-primary-600 text-white'
                          : page === '...'
                          ? 'border-0 cursor-default'
                          : 'border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.common.next} →
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
