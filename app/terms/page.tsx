'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function TermsPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">Amategeko n'Amabwiriza</h1>
            <p className="text-lg text-primary-100"> Guhera muri 2026</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Intangiriro</h2>
              <p>
                Aya mategeko n'amabwiriza agena uko urubuga rukora n'uko rukoreshwa. Agamije kurinda uburenganzira bw'abarukoresha, kubahiriza amahame y'imyitwarire myiza no kubungabunga umutekano w'amakuru. Ukoresheje uru rubuga, uba wemeye gukurikiza aya mategeko yose.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Ukoresha uru rubuga wemera ibi bikurikira:</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kwirinda gukora ibikorwa binyuranyije n'amategeko cyangwa n'imyitwarire myiza</li>
                <li>Kutangiza cyangwa gutesha agaciro uburenganzira bw'abandi</li>
                <li>Kwirinda amagambo asebanya, abangamira cyangwa ateza amakimbirane</li>
                <li>Kubahiriza amabwiriza n'amahame agenga uru rubuga</li>
                <li>Kwirinda gukoresha urubuga mu bikorwa byangiza amahoro, ubumwe n'ubwisanzure</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Imyitwarire Itemewe</h2>
              <p className="mb-4">
                Birabujijwe gukoresha uru rubuga mu bikorwa bikurikira:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gukwirakwiza amakuru y'ibinyoma cyangwa abangamira abandi</li>
                <li>Gutangaza cyangwa guhembera amagambo y'urwango n'amacakubiri</li>
                <li>Gukora ibikorwa by'urugomo, iterabwoba cyangwa gutoteza abandi</li>
                <li>Gutegura cyangwa gukwirakwiza ibintu bitemewe n'amategeko</li>
                <li>Kwangiza, gusenya cyangwa kwinjira mu buryo butemewe mu miyoboro y'ikoranabuhanga y'urubuga</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Umutekano n'Imikoreshereze y'Amakuru</h2>
              <p>
                Uru rubuga rukoresha amakuru mu buryo bwubahiriza amahame y'umutekano n'ibanga. Birabujijwe gukoresha nabi, kwiba cyangwa gukwirakwiza amakuru y'abandi. Abarukoresha basabwa kubahiriza politiki y'ibanga n'imikoreshereze y'amakuru.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Guhindura Amategeko</h2>
              <p>
                Ubuyobozi bw'uru rubuga bufite uburenganzira bwo guhindura aya mategeko n'amabwiriza igihe bibaye ngombwa. Impinduka zigatangazwa ku rubuga, kandi gukomeza kurukoresha bisobanura kwemera ayo mavugurura.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Guhagarika cyangwa Gukuraho Serivisi</h2>
              <p>
                Igihe bibaye ngombwa kandi hakurikijwe amategeko, uru rubuga rushobora guhagarika cyangwa gukuraho konti cyangwa serivisi ku muntu utubahirije aya mategeko n'amabwiriza.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Ibisobanuro rusange</h2>
              <p className="mb-4">
                Aya mategeko agomba gusobanurwa hakurikijwe amategeko agenga igihugu:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kurengera uburenganzira n'agaciro k'abantu</li>
                <li>Kubahiriza amategeko n'amabwiriza ariho</li>
                <li>Kurinda amahoro, umutekano n'ubwisanzure</li>
                <li>Gutanga amakuru asobanutse</li>
              </ul>
            </div>

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">📩 Kubaza cyangwa Gutanga Ibitekerezo</h3>
              <p>
                Kubaza ibisobanuro cyangwa gutanga ibitekerezo kuri aya mategeko, twandikire kuri: <br />
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

