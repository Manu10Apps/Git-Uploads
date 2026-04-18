import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payment Successful - Intambwe Media',
  description: 'Your premium subscription has been activated successfully.',
};

export default async function PremiumSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const canceled = params.canceled;

  if (canceled) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Payment Cancelled
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Your payment was cancelled. Your account has not been charged.
          </p>
          <div className="space-y-3">
            <Link
              href="/premium"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 w-full"
              style={{ backgroundColor: '#e3001b' }}
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors w-full"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Payment Successful!
        </h1>

        <p className="text-neutral-600 dark:text-neutral-400 mb-2">
          Thank you for subscribing to Intambwe Media Premium.
        </p>

        {sessionId && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-6 break-all">
            Session ID: {sessionId}
          </p>
        )}

        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Your premium subscription is now active<br/>
            ✓ You have access to all premium content<br/>
            ✓ A confirmation email has been sent
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 w-full"
            style={{ backgroundColor: '#e3001b' }}
          >
            Start Reading Premium Content
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors w-full"
          >
            View Account
          </Link>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-6">
          Need help? <a href="/contact" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">Contact Support</a>
        </p>
      </div>
    </main>
  );
}
