'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EpaperManager } from '@/app/components/EpaperManager';

export default function AdminEpaperPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    const adminToken = localStorage.getItem('adminToken');

    if (!adminAuth || !adminToken) {
      router.push('/admin/login');
      return;
    }

    setHasToken(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Authentication error. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <EpaperManager />
    </div>
  );
}
