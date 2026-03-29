'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function PrivacyPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">Politiki Ngenderwaho y'Ibanga</h1>
            <p className="text-lg text-primary-100">Guhera muri 2026</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Intangiriro</h2>
              <p>
                Twubaha uburenganzira bw'umuntu ku giti cye n'ibanga rye. Iyi politiki ngenderwaho y'ibanga igena uko dukusanya, dukoresha, tubika kandi turinda amakuru yihariye y'abakoresha serivisi zacu, yaba abayatanga ku rubuga cyangwa mu bundi buryo, harimo n'iyo atabitswe kuri seriveri zacu.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Amakuru Dukusanya</h2>
              <p className="mb-4">
                Dushobora gukusanya amakuru akurikira:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Izina ry'umuntu</li>
                <li>Aderesi ya imeli</li>
                <li>Nimero ya telefone</li>
                <li>Amakuru ajyanye n'imikoreshereze ya serivisi zacu</li>
                <li>Ibyifuzo by'urukoresha n'andi makuru ajyanye n'imikoreshereze y'uru rubuga</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Impamvu Dukoresha Amakuru</h2>
              <p className="mb-4">
                Amakuru dukusanya akoreshwa mu ntego zikurikira:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gutanga no kunoza serivisi zacu</li>
                <li>Koroshya imikoreshereze y'urubuga</li>
                <li>Kunoza imikoranire n'abarukoresha</li>
                <li>Gutanga amakuru ajyanye na serivisi, amatangazo cyangwa impinduka</li>
                <li>Kurinda umutekano n'imikorere myiza ya serivisi</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Kubika no Kurinda Amakuru</h2>
              <p className="mb-4">
                Amakuru yihariye abikwa hubahirijwe amategeko n'amahame agenga umutekano n'ibanga, agamije:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Koroshya imikoreshereze ya serivisi zacu</li>
                <li>Gutanga serivisi mu buryo bunoze</li>
                <li>Gusesengura no kunoza imikorere ya serivisi zacu</li>
                <li>Kubahiriza ibisabwa n'amategeko</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Uburenganzira bw'Ukoresha uru rubuga</h2>
              <p className="mb-4">
                Hakurikijwe iyi politiki, urukoresha afite uburenganzira bukurikira:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kubona amakuru ye yihariye tubitse</li>
                <li>Gusaba gukosorwa kw'amakuru atari yo</li>
                <li>Gusaba gusibwa cyangwa kugabanywa kw'ikoreshwa ry'amakuru ye, igihe amategeko abimwemerera</li>
                <li>Gusaba ibisobanuro ku ikoreshwa ry'amakuru ye</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Umutekano w'Amakuru</h2>
              <p>
                Dushyira mu bikorwa ingamba zikomeye zo kurinda amakuru yihariye kugira ngo adatakara, adahindurwa cyangwa adakoreshwa nabi. Igihe bibaye ngombwa, dufata ingamba zo gukumira no gukosora icyahungabanya umutekano w'amakuru.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Impinduka kuri Iyi Politiki</h2>
              <p>
                Dufite uburenganzira bwo guhindura iyi politiki ngenderwaho y'ibanga igihe bibaye ngombwa. Impinduka zigatangazwa ku rubuga, kandi abarukoresha basabwa kugenzura iyi politiki buri gihe.
              </p>
            </div>

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">📩 Kubaza cyangwa Gutanga Ibitekerezo</h3>
              <p>
                Kubaza ibisobanuro cyangwa gutanga ibitekerezo bijyanye n'iyi politiki y'ibanga, twandikira: <br />
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

