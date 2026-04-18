'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface StripePaymentButtonProps {
  className?: string;
  label?: string;
  amount?: number; // Amount in cents (e.g., 2999 = $29.99)
  currency?: string;
}

export default function StripePaymentButton({
  className = "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90",
  label = "Premium",
  amount = 100, // Default $1.00
  currency = "usd",
}: StripePaymentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!amount || amount < 100) {
        throw new Error('Amount must be at least $1.00');
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
          amount,
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
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback: Use sessionId to redirect
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

  return (
    <>
      <button
        onClick={handleClick}
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
