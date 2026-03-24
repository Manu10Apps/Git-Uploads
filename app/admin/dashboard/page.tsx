'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/app/admin/components/AdminHeader';
import DashboardStats from '@/app/admin/components/DashboardStats';
import { Footer } from '@/app/components';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    if (!isAdminAuth) {
      router.push('/admin/login');
    } else {
      setAdminName(localStorage.getItem('adminName') || 'Admin');
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Welcome back, {adminName}!
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Here's an overview of your content management system
            </p>
          </div>

          {/* Dashboard Stats */}
          <DashboardStats />
        </div>
      </main>
      <Footer />
    </>
  );
}
