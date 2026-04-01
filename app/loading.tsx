import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-red-600/20 dark:border-red-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-red-600 dark:border-red-500 animate-spin" />
          <Image
            src="/logo.png"
            alt="Intambwe Media"
            width={48}
            height={48}
            sizes="48px"
            priority
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-lg animate-pulse"
          />
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium">
          Kugaragara biri gukorwaho
        </p>
      </div>
    </div>
  );
}
