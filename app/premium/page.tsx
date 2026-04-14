'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function PremiumPage() {
  const { language, setLanguage } = useAppStore();
  const t = getTranslation(language);
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
      setMessage(language === 'ky' ? 'Ongereza nimiro y\'icyuma' : 'Please enter your phone number');
      setPaymentStatus('error');
      return;
    }

    if (finalAmount < 200) {
      setMessage(language === 'ky' ? 'Ingano igomba kuva 200 RWF' : 'Amount must be at least 200 RWF');
      setPaymentStatus('error');
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');
    setMessage(language === 'ky' ? 'Imishyikirano irekuramo...' : 'Processing your payment...');

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
          language === 'ky'
            ? `Ijambo ryobwigire: ${data.transactionId}\n\nAndika USSD code Cyuma cyakurwa ya MTN/Airtel. Uramundane mu intara y'insanganyamatsiko.`
            : `Reference: ${data.transactionId}\n\nCheck your phone for USSD prompt. Complete the payment confirmation on your device.`
        );
        setPhoneNumber('');
        
        // Auto-check payment status after 30 seconds
        setTimeout(() => checkPaymentStatus(data.transactionId), 30000);
      } else {
        setPaymentStatus('error');
        setMessage(data.message || (language === 'ky' ? 'Habaye ikosa mu cyuma' : 'Payment failed'));
      }
    } catch (error) {
      setPaymentStatus('error');
      setMessage(language === 'ky' ? 'Habaye ikosa, yongera kugerageza' : 'An error occurred. Please try again.');
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
          language === 'ky'
            ? `Icyuma cyakozwe neza!\n\nMwibwagenguye ku rwego rw'Intambwe Media. Ijambo ryobwigire: ${txRef}`
            : `Payment confirmed!\n\nThank you for supporting Intambwe Media. Reference: ${txRef}`
        );
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-between px-4 py-8">
      {/* Language Switcher */}
      <div className="w-full flex justify-end mb-6">
        <div className="flex gap-2">
          {(['ky', 'en', 'sw'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                language === lang
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
            >
              {lang === 'ky' ? 'RW' : lang === 'en' ? 'En' : 'Sw'}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8 hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="Intambwe Media"
            width={48}
            height={48}
            className="h-9 w-9 rounded-lg sm:h-12 sm:w-12"
            priority
          />
        </Link>

        {/* Payment Form */}
        <form onSubmit={handlePayment} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-6 sm:p-8 border border-neutral-200 dark:border-neutral-700">
              {/* Amount Selection */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                  {language === 'ky' ? 'Hitamo ingano y\'amafaranga (RWF)' : 'Select Amount (RWF)'}
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
                    {language === 'ky' ? 'Cyangwa Wandike Ingano y\'amafaranga arenga 2000 (RWF)' : 'Or enter custom amount above 2000 (RWF)'}
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
                  {language === 'ky' ? 'Nimiro yawe (MTN/Airtel)' : 'Phone Number (MTN/Airtel)'}
                </label>
                <input
                  type="tel"
                  placeholder={language === 'ky' ? '+250 788/703 xxx xxx' : '+250 788/703 xxx xxx'}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none disabled:opacity-50"
                  required
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {language === 'ky'
                    ? 'Urakira ubutumwa kuri telefone yawe bugusaba Gukomeza'
                    : 'You\'ll receive a USSD prompt to confirm the payment.'}
                </p>
              </div>

              {/* Display Selected Amount */}
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 mb-8 border-l-4 border-red-600">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {language === 'ky' ? 'Ingano y\'amafaranga wahisemo' : 'Amount to Pay'}
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {finalAmount.toLocaleString()} RWF
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {language === 'ky'
                    ? 'Amazina y\'Uwakira: Emmanuel Ndahayo (0788823265)'
                    : 'Receiver: Emmanuel Ndahayo (0788823265)'}
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
                  ? language === 'ky'
                    ? 'Imishyikirano...'
                    : 'Processing...'
                  : paymentStatus === 'success'
                    ? language === 'ky'
                      ? 'Icyuma cyakozwe'
                      : 'Payment Sent'
                    : language === 'ky'
                      ? 'Emeza Gukomeza'
                      : 'Pay Now'}
              </button>

              {/* Terms */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                {language === 'ky'
                  ? 'Nuhitamo Gukomeza Uraba Uteye Inkunga E-Gazeti ya Intambwe Media'
                  : 'By proceeding, you agree to our terms and KPay\'s payment terms.'}
              </p>
            </form>
          </div>
        </main>
      );
    }
