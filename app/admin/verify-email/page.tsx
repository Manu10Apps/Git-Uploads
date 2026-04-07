'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function VerifyAdminEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Verifying your email...');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setMessage('Missing verification token.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setMessage(data.message || 'Invalid or expired verification link.');
          setIsSuccess(false);
        } else {
          setMessage(data.message || 'Email verified successfully.');
          setIsSuccess(true);
        }
      } catch {
        setMessage('Failed to verify email. Please try again later.');
        setIsSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Admin Email Verification</h1>
        <p className={`text-sm mb-6 ${isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {loading ? 'Verifying your email...' : message}
        </p>
        {!loading && (
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#667684] hover:bg-[#556270] text-white rounded-lg font-semibold"
          >
            Go to Admin Login
          </Link>
        )}
      </div>
    </div>
  );
}
