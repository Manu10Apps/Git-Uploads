'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(amount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [exchangeLoading, setExchangeLoading] = useState(true);

  const presetAmounts = [100, 300, 500]; // $1, $3, $5

  // Fetch USD to RWF exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setExchangeLoading(true);
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data.rates && data.rates.RWF) {
          setExchangeRate(data.rates.RWF);
        } else {
          // Fallback rate if API fails
          setExchangeRate(1300);
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err);
        // Fallback rate
        setExchangeRate(1300);
      } finally {
        setExchangeLoading(false);
      }
    };

    fetchExchangeRate();
    // Refresh exchange rate every 6 hours
    const interval = setInterval(fetchExchangeRate, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      selectAmount: {
        ky: 'Hitamo ingano y\'amafaranga',
        en: 'Select Amount',
        sw: 'Chagua Kiasi',
      },
      custom: {
        ky: 'Ingano y\'amafaranga wihitiyemo (USD)',
        en: 'Custom Amount (USD)',
        sw: 'Kiasi cha Kawaida (USD)',
      },
      enterAmount: {
        ky: 'Andika ingano',
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
        ky: 'Ingano igomba kuva $1.00',
        en: 'Amount must be at least $1.00',
        sw: 'Kiasi lazima kuwa angalau $1.00',
      },
      exchangeRate: {
        ky: 'Ibisesero (FRW)',
        en: 'Equivalent (RWF)',
        sw: 'Sawa na (RWF)',
      },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  const finalAmount = customAmount ? Math.round(parseFloat(customAmount) * 100) : selectedAmount;
  const finalAmountUSD = finalAmount / 100;
  const rwfAmount = exchangeRate ? Math.round(finalAmountUSD * exchangeRate) : null;

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!finalAmount || finalAmount < 100) {
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
          currency,
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
              ${(amt / 100).toFixed(2)}
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="mb-4 text-center">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 text-center">
            {getTranslation('custom')}
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder={getTranslation('enterAmount')}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(0);
            }}
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none disabled:opacity-50 text-sm"
          />
        </div>

        {/* Exchange Rate Display */}
        {!exchangeLoading && rwfAmount && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {rwfAmount.toLocaleString()} RWF
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              ${finalAmountUSD.toFixed(2)} USD ≈ {rwfAmount.toLocaleString()} RWF
            </p>
          </div>
        )}

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
          {isLoading ? getTranslation('processing') : `${getTranslation('payButton')} $${(finalAmount / 100).toFixed(2)}`}
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
