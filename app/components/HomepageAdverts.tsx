'use client';

import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import type { HomepageAdvert } from '@/lib/homepage-data';

export function HomepageAdverts({
  topAdverts,
  bottomAdverts,
  section = 'top',
}: {
  topAdverts: HomepageAdvert[];
  bottomAdverts: HomepageAdvert[];
  section?: 'top' | 'bottom';
}) {
  const { language } = useAppStore();
  const t = getTranslation(language);

  if (section === 'bottom') {
    return (
      /* Bottom advert section — mobile only */
      <section className="lg:hidden py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 text-center">
            {t.article.advertLabel}
          </p>
          {bottomAdverts.length > 0 ? (
            bottomAdverts.slice(0, 1).map((advert) => (
              <a
                key={`bottom-mobile-${advert.id}`}
                href={advert.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full group hover:opacity-90 transition-opacity"
              >
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                  <img
                    src={advert.imageUrl}
                    alt={advert.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </a>
            ))
          ) : (
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-64 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Top advert section — mobile shows first top ad, desktop shows top + bottom side by side */}
      <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 text-center">
            {t.article.advertLabel}
          </p>

          {/* Mobile: single top ad */}
          <div className="lg:hidden">
            {topAdverts.length > 0 ? (
              topAdverts.slice(0, 1).map((advert) => (
                <a
                  key={`top-mobile-${advert.id}`}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full group hover:opacity-90 transition-opacity"
                >
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={advert.imageUrl}
                      alt={advert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </a>
              ))
            ) : (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-64 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            )}
          </div>

          {/* Tablet & Desktop: top ad + bottom ad side by side - visible on md+ */}
          <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
            {topAdverts.length > 0 ? (
              topAdverts.slice(0, 1).map((advert) => (
                <a
                  key={`top-desktop-${advert.id}`}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full group hover:opacity-90 transition-opacity"
                >
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={advert.imageUrl}
                      alt={advert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </a>
              ))
            ) : (
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-64 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            )}

            {bottomAdverts.length > 0 ? (
              bottomAdverts.slice(0, 1).map((advert) => (
                <a
                  key={`bottom-desktop-${advert.id}`}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full group hover:opacity-90 transition-opacity"
                >
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={advert.imageUrl}
                      alt={advert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </a>
              ))
            ) : (
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-64 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            )}
          </div>
        </div>
      </section>

    </>
  );
}
