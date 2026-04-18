'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface StripePaymentButtonProps {
  className?: string;
  label?: string;
  amount?: number; // Amount in cents (e.g., 100 = $1.00)
  currency?: string;
  showAmountSelector?: boolean;
  language?: 'ky' | 'en' | 'sw';
}

export default function StripePaymentButton({
  className = "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90",
  label = "Premium",
  amount = 100, // Default $1.00
  currency = "usd",
  showAmountSelector = false,
  language = "en",
}: StripePaymentButtonProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'rwf'>(currency as 'usd' | 'rwf' || 'usd');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(amount);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Currency presets: USD in cents, RWF in base units
  const presetAmounts = selectedCurrency === 'usd' ? [100, 300, 500] : [5000, 10000, 25000]; // USD: $1, $3, $5 | RWF: 5k, 10k, 25k

  const getCurrencySymbol = (): string => selectedCurrency === 'usd' ? '$' : 'FRw';
  const getMinimumAmount = (): number => selectedCurrency === 'usd' ? 100 : 1000; // 100 cents = $1, 1000 RWF

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      selectAmount: {
        ky: 'Hitamo ingano y\'amafaranga',
        en: 'Select Amount',
        sw: 'Chagua Kiasi',
      },
      custom: {
        ky: 'Ingano y\'amafaranga wihitiyemo',
        en: 'Custom Amount',
        sw: 'Kiasi cha Kawaida',
      },
      enterAmount: {
        ky: 'Andike ingano',
        en: 'Enter custom amount',
        sw: 'Ingiza kiasi cha kawaida',
      },
      payButton: {
        ky: 'Ishyura',
        en: 'Pay Now',
        sw: 'Lipa Sasa',
      },
      processing: {
        ky: 'Imishyikirano...',
        en: 'Processing...',
        sw: 'Inaendelea...',
      },
      minimum: {
        ky: selectedCurrency === 'usd' ? 'Ingano igomba kuva $1.00' : 'Ingano igomba kuva FRw 1,000',
        en: selectedCurrency === 'usd' ? 'Amount must be at least $1.00' : 'Amount must be at least FRw 1,000',
        sw: selectedCurrency === 'usd' ? 'Kiasi lazima kuwa angalau $1.00' : 'Kiasi lazima kuwa angalau FRw 1,000',
      },
      usd: {
        ky: 'USD',
        en: 'USD',
        sw: 'USD',
      },
      rwf: {
        ky: 'RWF',
        en: 'RWF',
        sw: 'RWF',
      },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  const finalAmount = customAmount ? Math.round(parseFloat(customAmount) * (selectedCurrency === 'usd' ? 100 : 1)) : selectedAmount;

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const minAmount = getMinimumAmount();
      if (!finalAmount || finalAmount < minAmount) {
        throw new Error(getTranslation('minimum'));
      }

      const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${currentUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${currentUrl}/premium?canceled=true`;

      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency: selectedCurrency,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showAmountSelector) {
    return (
      <div className="w-full text-center">
        {/* Currency Selector */}
        <div className="flex gap-2 justify-center mb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedCurrency('usd');
              setSelectedAmount(100);
              setCustomAmount('');
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              selectedCurrency === 'usd'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300'
            }`}
          >
            {getTranslation('usd')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCurrency('rwf');
              setSelectedAmount(5000);
              setCustomAmount('');
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              selectedCurrency === 'rwf'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300'
            }`}
          >
            {getTranslation('rwf')}
          </button>
        </div>

        <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-3 text-center">
          {getTranslation('selectAmount')}
        </label>
        
        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4 justify-center mx-auto">
          {presetAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setSelectedAmount(amt);
                setCustomAmount('');
              }}
              disabled={isLoading}
              className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                selectedAmount === amt && !customAmount
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600 hover:border-red-600 disabled:opacity-50'
              }`}
            >
              {selectedCurrency === 'usd' ? `$${(amt / 100).toFixed(2)}` : `FRw ${(amt).toLocaleString()}`}
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="mb-4 text-center">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 text-center">
            {getTranslation('custom')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step={selectedCurrency === 'usd' ? '0.01' : '1'}
              placeholder={getTranslation('enterAmount')}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none disabled:opacity-50 text-sm"
            />
            <span className="flex items-center px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-600 text-neutral-900 dark:text-white font-semibold text-sm">
              {getCurrencySymbol()}
            </span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className={className}
          style={{
            backgroundColor: '#e3001b',
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {isLoading ? getTranslation('processing') : `${getTranslation('payButton')} ${selectedCurrency === 'usd' ? `$${(finalAmount / 100).toFixed(2)}` : `FRw ${(finalAmount).toLocaleString()}`}`}
        </button>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className={className}
        style={{
          backgroundColor: '#e3001b',
          opacity: isLoading ? 0.7 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Processing...' : label}
      </button>
      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </>
  );
}
