import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto text-red-600 dark:text-red-500 animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium">
          Kugaragara biri gukorwaho
        </p>
      </div>
    </div>
  );
}
