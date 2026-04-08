'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export function NewsletterSignup() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <section id="newsletter" className="mt-[35px] py-10 bg-neutral-100 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-red-600 text-xs font-semibold tracking-widest mb-3">{t.newsletter.label}</div>
        <h2 className="text-xl sm:text-2xl md:text-2xl font-serif font-bold text-neutral-900 dark:text-white mb-3">
          {t.newsletter.title}
        </h2>
        <p className="max-w-md mx-auto text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 mb-8 font-light">
          {t.newsletter.description}
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
          <input
            type="email"
            placeholder={t.newsletter.placeholder}
            className="flex-1 px-4 py-3 rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none text-sm"
            required
          />
          <button
            className="px-6 py-3 text-white font-medium rounded-sm transition-colors text-sm bg-[#e2001a] hover:bg-[#b50015]"
          >
            {t.newsletter.subscribe}
          </button>
        </form>
      </div>
    </section>
  );
}