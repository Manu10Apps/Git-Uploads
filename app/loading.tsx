import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-red-600/8 dark:bg-red-500/10" />
          <div className="absolute inset-1 rounded-full border border-red-600/20 dark:border-red-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-600 border-b-red-600/60 dark:border-t-red-500 dark:border-b-red-500/60 animate-[spin_2s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-l-red-600/70 border-r-red-600 dark:border-l-red-500/70 dark:border-r-red-500 animate-[spin_1.3s_linear_infinite_reverse]" />
          <Image
            src="/logo.png"
            alt="Intambwe Media"
            width={48}
            height={48}
            sizes="48px"
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-[0_0_24px_rgba(220,38,38,0.3)] animate-[pulse_1.6s_ease-in-out_infinite]"
          />
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium">
          Kugaragara biri gukorwaho
        </p>
      </div>
    </div>
  );
}
