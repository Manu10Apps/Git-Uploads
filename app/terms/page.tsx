'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function TermsPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const tr = t.terms;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">{tr.title}</h1>
            <p className="text-lg text-primary-100">{tr.subtitle}</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s1Title}</h2>
              <p>{tr.s1}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s2Title}</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {tr.s2Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s3Title}</h2>
              <p className="mb-4">{tr.s3Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {tr.s3Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s4Title}</h2>
              <p>{tr.s4}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s5Title}</h2>
              <p>{tr.s5}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s6Title}</h2>
              <p>{tr.s6}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{tr.s7Title}</h2>
              <p className="mb-4">{tr.s7Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {tr.s7Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{tr.contactTitle}</h3>
              <p>
                {tr.contactText} <br />
                <span className="font-semibold">legal@intambwemedia.com</span>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}


