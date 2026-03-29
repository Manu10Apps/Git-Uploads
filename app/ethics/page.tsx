'use client';

import React from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function EthicsPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Header Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">Amahame Ngenderwaho y'Ubwanditsi</h1>
            <p className="text-lg text-primary-100"> Guhera muri 2026</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
            <div>
              <p className="text-lg leading-relaxed">
                Amakuru n'imyitwarire ishingiye ku mahame ngenderwaho y'ubwanditsi. Aya mahame agena uko amakuru atangwa, agamije kurinda ukuri, ubwigenge n'inyungu rusange z'abaturage, bityo amakuru agahora yizewe kandi atabogamye.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Ukuri n'Ubwigenge</h2>
              <p className="mb-4">
                Amahame shingiro y'ubwanditsi ashingiye ku:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gutanga amakuru yizewe, yuzuye kandi atabogamye</li>
                <li>Kwirinda gutangaza amakuru adafite gihamya ihagije</li>
                <li>Kurengera ukuri n'impamvu zishingiye ku bimenyetso</li>
                <li>Gutanga amakuru yigenga, adashingiye ku gitutu icyo ari cyo cyose</li>
                <li>Gukorera inyungu rusange n'amahoro z'abaturage</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Kwigenga no Kwirinda Kubogama</h2>
              <p className="mb-4">
                Itangazamakuru rigomba guhora ryigenga mu bitekerezo no mu bikorwa byaryo:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kwirinda ivangura iryo ari ryo ryose</li>
                <li>Gutangaza amakuru ashingiye ku kuri no ku bimenyetso bifatika</li>
                <li>Gukora kinyamwuga, nta kubogama cyangwa kubogamira ku ruhande runaka</li>
                <li>Kwirinda gutangaza amakuru ashobora guteza amacakubiri cyangwa amakimbirane</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Kubaha Ikiremwamuntu</h2>
              <p className="mb-4">
                Ubwanditsi bugomba kubaha agaciro k'umuntu:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kwirinda amagambo asebanya, abangamira cyangwa atoteza abantu</li>
                <li>Kurengera uburenganzira n'ubwigenge bw'umuntu</li>
                <li>Kwirinda guhembera inzangano cyangwa ivangura</li>
                <li>Gukorera mu mahoro no mu bwubahane hagati y'abantu</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Ubunyamwuga n'Ubwigenge mu Kazi</h2>
              <p className="mb-4">
                Umwanditsi agomba:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gutangaza amakuru atandukanye kandi yuzuzanya</li>
                <li>Gutandukanya amakuru n'ibitekerezo (amakuru n'ibitekerezo by'umwanditsi)</li>
                <li>Kurinda ubwigenge bwe n'ubw'abatanga amakuru</li>
                <li>Gutangaza amakuru mu buryo buboneye kandi bufite inshingano</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Kurengera Inyungu Rusange</h2>
              <p className="mb-4">
                Itangazamakuru rigomba guharanira inyungu rusange:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kwirinda guhindura cyangwa gutesha agaciro amakuru</li>
                <li>Kurinda amateka n'ukuri kwayo</li>
                <li>Gukora mu nyungu z'amahoro, ubumwe n'ubwiyunge bw'abaturage</li>
                <li>Gutanga amakuru yubaka sosiyete</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Kubahiriza Amahame Ngenderwaho</h2>
              <p>
                Ubwanditsi bwose bugomba kubahiriza aya mahame ngenderwaho, haba mu bihe by'amahoro cyangwa mu bihe by'ibibazo, hagamijwe kurinda icyizere cy'abaturage n'agaciro k'umwuga w'itangazamakuru.
              </p>
            </div>

            <div className="bg-primary-50 dark:bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">📩 Kubaza cyangwa Gutanga Ibitekerezo</h3>
              <p>
                Kubaza cyangwa gutanga ibitekerezo ku mahame ngenderwaho y'ubwanditsi, twandikire kuri: <br />
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

