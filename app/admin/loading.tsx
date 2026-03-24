import React from 'react';
import { Loader2 } from 'lucide-react';
import AdminHeader from './components/AdminHeader';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-red-600 dark:text-red-500 animate-spin mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium">
              Kugaragara biri gukorwaho
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
