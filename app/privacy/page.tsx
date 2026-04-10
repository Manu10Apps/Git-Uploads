'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function PrivacyPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const p = t.privacy;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">{p.title}</h1>
            <p className="text-lg text-primary-100">{p.subtitle}</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            {p.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{section.heading}</h2>
                {'intro' in section && section.intro && (
                  <p className="mb-4">{section.intro}</p>
                )}
                {'items' in section && section.items && (
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
                {'body' in section && section.body && (
                  <p>{section.body}</p>
                )}
              </div>
            ))}

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{p.contactTitle}</h3>
              <p>
                {p.contactBody} <br />
                <span className="font-semibold">privacy@intambwemedia.com</span>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

