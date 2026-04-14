'use client';

import React, { useState } from 'react';
import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function PremiumPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionId, setTransactionId] = useState('');

  const amounts = [200, 500, 1000, 1500, 2000];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setMessage(language === 'ky' ? 'Ongereza nimiro y\'icyuma' : 'Please enter your phone number');
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
          amount: selectedAmount,
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
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-900">
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                {language === 'ky' ? 'Ifatabuguzi' : 'Premium Support'}
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                {language === 'ky'
                  ? 'Rema inzira Intambwe Media mu cyuma guto. Muhire mu mbuga nkuru z\'Afurika.'
                  : 'Support quality journalism. Powered by Flutterwave.'}
              </p>
            </div>

            {/* Payment Form */}
            <form onSubmit={handlePayment} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-6 sm:p-8 border border-neutral-200 dark:border-neutral-700">
              {/* Amount Selection */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                  {language === 'ky' ? 'Hitamo ingano y\'icyuma (RWF)' : 'Select Amount (RWF)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {amounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setSelectedAmount(amount)}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                        selectedAmount === amount
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600 hover:border-red-600'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  {language === 'ky' ? 'Nimiro y\'icyuma (MTN/Airtel)' : 'Phone Number (MTN/Airtel)'}
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
                    ? 'Ushobora gufite *USSD prompt*. Andika ijambo ryobwigire nyuma yo gutangira.'
                    : 'You\'ll receive a USSD prompt to confirm the payment.'}
                </p>
              </div>

              {/* Display Selected Amount */}
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 mb-8 border-l-4 border-red-600">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {language === 'ky' ? 'Ingano yo kurema' : 'Amount to Pay'}
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {selectedAmount.toLocaleString()} RWF
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {language === 'ky'
                    ? 'Kurere: Emmanuel Ndahayo (0788823265)'
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
                      ? 'Rema icyuma'
                      : 'Pay Now'}
              </button>

              {/* Terms */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                {language === 'ky'
                  ? 'Mu gusobanura, wavuze ko wemeye amategeko y\'impigania ibyacuruza ya Flutterwave n\'Intambwe Media.'
                  : 'By proceeding, you agree to our terms and Flutterwave\'s payment terms.'}
              </p>
            </form>

            {/* Powered by Flutterwave */}
            <div className="text-center mt-8">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'ky' ? 'Impigania icyuma: ' : 'Payments powered by '}
                <a 
                  href="https://flutterwave.com/rw/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 font-semibold"
                >
                  Flutterwave
                </a>
              </p>
            </div>

            {/* Info Box */}
            <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-3">
                {language === 'ky' ? 'Iki cyuma' : 'About This Payment'}
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <li>
                  {language === 'ky'
                    ? '✓ Rema imbere ya Intambwe Media na gahunda z\'amakuru'
                    : '✓ Support Intambwe Media journalism and operations'}
                </li>
                <li>
                  {language === 'ky'
                    ? '✓ Mu masoko (MTN n\'Airtel) mukarangiza icyuma ku minuta 2'
                    : '✓ Payment processed instantly via MTN & Airtel networks'}
                </li>
                <li>
                  {language === 'ky'
                    ? '✓ 100% y\'icyuma imonera mu nzira ya Emmanuel Ndahayo'
                    : '✓ 100% of funds go directly to Emmanuel Ndahayo'}
                </li>
                <li>
                  {language === 'ky'
                    ? '✓ Icyuma cyokuwinjizwa cyisi kandi cyigire'
                    : '✓ Secure and encrypted payment processing'}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
