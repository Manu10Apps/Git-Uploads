'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function EthicsPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const e = t.ethics;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">{e.title}</h1>
            <p className="text-lg text-primary-100">{e.subtitle}</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            <div>
              <p className="text-lg leading-relaxed">{e.intro}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s1Title}</h2>
              <p className="mb-4">{e.s1Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {e.s1Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s2Title}</h2>
              <p className="mb-4">{e.s2Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {e.s2Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s3Title}</h2>
              <p className="mb-4">{e.s3Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {e.s3Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s4Title}</h2>
              <p className="mb-4">{e.s4Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {e.s4Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s5Title}</h2>
              <p className="mb-4">{e.s5Intro}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {e.s5Items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{e.s6Title}</h2>
              <p>{e.s6}</p>
            </div>

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{e.contactTitle}</h3>
              <p>
                {e.contactText} <br />
                <span className="font-semibold">ethics@intambwemedia.com</span>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
