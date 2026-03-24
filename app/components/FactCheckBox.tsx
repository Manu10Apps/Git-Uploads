'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

interface FactCheckProps {
  claims: {
    text: string;
    status: 'verified' | 'partially' | 'disputed' | 'unverified';
    sources: string[];
  }[];
}

export function FactCheckBox({ claims }: FactCheckProps) {
  const { language } = useAppStore();
  const t = getTranslation(language);

  const statusConfig = {
    verified: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      label: '✓ Verified',
    },
    partially: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      label: '? Partially Verified',
    },
    disputed: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      label: '✗ Disputed',
    },
    unverified: {
      bg: 'bg-neutral-50 dark:bg-neutral-900/20',
      border: 'border-neutral-200 dark:border-neutral-800',
      badge: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
      label: '⚠ Unverified',
    },
  };

  return (
    <div className="my-6 space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <span className="text-xl">🔍</span>
        {t.article.factCheck}
      </h3>

      {claims.map((claim, index) => {
        const config = statusConfig[claim.status];
        return (
          <div
            key={index}
            className={`${config.bg} ${config.border} border rounded-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`${config.badge} px-3 py-1 rounded text-sm font-semibold flex-shrink-0 whitespace-nowrap`}
              >
                {config.label}
              </span>
              <p className="text-sm">{claim.text}</p>
            </div>
            {claim.sources.length > 0 && (
              <div className="mt-3 ml-16">
                <p className="text-xs font-semibold mb-1">Isooko:</p>
                <ul className="text-xs space-y-1">
                  {claim.sources.map((source, i) => (
                    <li key={i} className="text-neutral-600 dark:text-neutral-400">
                      • {source}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

