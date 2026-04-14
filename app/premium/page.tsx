'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function PremiumPage() {
  const { language, setLanguage } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [currentLang, setCurrentLang] = useState<'ky' | 'en' | 'sw'>('ky');
  
  useEffect(() => {
    setMounted(true);
    setCurrentLang(language);
  }, [language]);

  const t = getTranslation(currentLang);
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionId, setTransactionId] = useState('');

  const amounts = [200, 500, 1000, 1500, 2000];

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setMessage(currentLang === 'ky' ? 'Ongereza nimiro y\'icyuma' : currentLang === 'en' ? 'Please enter your phone number' : 'Tafadhali ingiza namba ya simu yako');
      setPaymentStatus('error');
      return;
    }

    if (finalAmount < 200) {
      setMessage(currentLang === 'ky' ? 'Ingano igomba kuva 200 RWF' : currentLang === 'en' ? 'Amount must be at least 200 RWF' : 'Kiasi lazima kuwa angalau 200 RWF');
      setPaymentStatus('error');
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');
    setMessage(currentLang === 'ky' ? 'Imishyikirano irekuramo...' : currentLang === 'en' ? 'Processing your payment...' : 'Inaendelea na malipo yako...');

    try {
      const response = await fetch('/api/premium/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          language,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTransactionId(data.transactionId);
        setPaymentStatus('success');
        setMessage(
          currentLang === 'ky'
            ? `Ijambo ryobwigire: ${data.transactionId}\n\nAndika USSD code Cyuma cyakurwa ya MTN/Airtel. Uramundane mu intara y'insanganyamatsiko.`
            : currentLang === 'en'
            ? `Reference: ${data.transactionId}\n\nCheck your phone for USSD prompt. Complete the payment confirmation on your device.`
            : `Kumbukumbu: ${data.transactionId}\n\nKagua simu yako kwa ujumbe wa USSD. Kamata kupatiliza uthibitisho wa malipo kwenye kifaa chako.`
        );
        setPhoneNumber('');
        
        // Auto-check payment status after 30 seconds
        setTimeout(() => checkPaymentStatus(data.transactionId), 30000);
      } else {
        setPaymentStatus('error');
        setMessage(data.message || (currentLang === 'ky' ? 'Habaye ikosa mu cyuma' : currentLang === 'en' ? 'Payment failed' : 'Malipo yalishindwa'));
      }
    } catch (error) {
      setPaymentStatus('error');
      setMessage(currentLang === 'ky' ? 'Habaye ikosa, yongera kugerageza' : currentLang === 'en' ? 'An error occurred. Please try again.' : 'Kumetokea hitilafu. Tafadhali jaribu tena.');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (txRef: string) => {
    try {
      const response = await fetch(`/api/premium/verify?tx_ref=${txRef}`);
      const data = await response.json();
      
      if (data.status === 'successful') {
        setPaymentStatus('success');
        setMessage(
          currentLang === 'ky'
            ? `Icyuma cyakozwe neza!\n\nMwibwagenguye ku rwego rw'Intambwe Media. Ijambo ryobwigire: ${txRef}`
            : currentLang === 'en'
            ? `Payment confirmed!\n\nThank you for supporting Intambwe Media. Reference: ${txRef}`
            : `Malipo yamehakikiwa!\n\nAsanteni kwa kusaidia Intambwe Media. Kumbukumbu: ${txRef}`
        );
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-between px-4 py-8">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="Intambwe Media"
            width={80}
            height={80}
            className="h-16 w-16 rounded-lg sm:h-20 sm:w-20"
            priority
          />
          <p className="text-center mt-3 text-4xl font-semibold font-sinbad-the-sailor text-neutral-900 dark:text-white">
            Intambwe Media
          </p>
          {/* Language Switcher */}
          <div className="flex gap-1 mt-2">
            {(['ky', 'en', 'sw'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setCurrentLang(lang);
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  currentLang === lang
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
                }`}
              >
                {lang === 'ky' ? 'RW' : lang === 'en' ? 'EN' : 'SW'}
              </button>
            ))}
          </div>
        </Link>

        {/* Payment Form */}
        <form onSubmit={handlePayment} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-6 sm:p-8 border border-neutral-200 dark:border-neutral-700">
              {/* Amount Selection */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                  {currentLang === 'ky' ? 'Hitamo ingano y\'amafaranga (RWF)' : currentLang === 'en' ? 'Select Amount (RWF)' : 'Chagua Kiasi (RWF)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {amounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                        selectedAmount === amount && !customAmount
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600 hover:border-red-600'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                
                {/* Custom Amount Input */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {currentLang === 'ky' ? 'Cyangwa Wandike Ingano y\'amafaranga arenga 2000 (RWF)' : currentLang === 'en' ? 'Or enter custom amount above 2000 (RWF)' : 'Au ingiza kiasi cha kawaida zaidi ya 2000 (RWF)'}
                  </label>
                  <input
                    type="number"
                    min="200"
                    placeholder="2500"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(0);
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none disabled:opacity-50 text-sm"
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  {currentLang === 'ky' ? 'Nimiro yawe (MTN/Airtel)' : currentLang === 'en' ? 'Phone Number (MTN/Airtel)' : 'Namba ya Simu (MTN/Airtel)'}
                </label>
                <input
                  type="tel"
                  placeholder={currentLang === 'ky' ? '+250 788/703 xxx xxx' : '+250 788/703 xxx xxx'}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none disabled:opacity-50"
                  required
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {currentLang === 'ky'
                    ? 'Urakira ubutumwa kuri telefone yawe bugusaba Gukomeza'
                    : currentLang === 'en'
                    ? 'You\'ll receive a USSD prompt to confirm the payment.'
                    : 'Utapokea ujumbe wa USSD kwenye simu yako ujumbe ukuomba kubadilisha.'}
                </p>
              </div>

              {/* Display Selected Amount */}
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 mb-8 border-l-4 border-red-600">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {currentLang === 'ky' ? 'Ingano y\'amafaranga wahisemo' : currentLang === 'en' ? 'Amount to Pay' : 'Kiasi cha Kulipa'}
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {finalAmount.toLocaleString()} RWF
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {currentLang === 'ky'
                    ? 'Amazina y\'Uwakira: Emmanuel Ndahayo (0788823265)'
                    : currentLang === 'en'
                    ? 'Receiver: Emmanuel Ndahayo (0788823265)'
                    : 'Mpokeaji: Emmanuel Ndahayo (0788823265)'}
                </div>
              </div>

              {/* Status Message */}
              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg text-sm whitespace-pre-line ${
                    paymentStatus === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : paymentStatus === 'processing'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || paymentStatus === 'success'}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading
                  ? currentLang === 'ky'
                    ? 'Imishyikirano...'
                    : currentLang === 'en'
                    ? 'Processing...'
                    : 'Inaendelea...'
                  : paymentStatus === 'success'
                    ? currentLang === 'ky'
                      ? 'Icyuma cyakozwe'
                      : currentLang === 'en'
                      ? 'Payment Sent'
                      : 'Malipo Yalitumwa'
                    : currentLang === 'ky'
                      ? 'Ishyura Nonaha'
                      : currentLang === 'en'
                      ? 'Pay Now'
                      : 'Lipa Sasa'}
              </button>

              {/* Terms */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                {currentLang === 'ky'
                  ? 'Nuhitamo Gukomeza Uraba Uteye Inkunga E-Gazeti ya Intambwe Media'
                  : currentLang === 'en'
                  ? 'By proceeding, You agree to support Intambwe Media E-Paper'
                  : 'Kwa kuendelea, unakubaliana kusaidia Intambwe Media E-Paper'}
              </p>
            </form>
          </div>
        </main>
      );
    }
