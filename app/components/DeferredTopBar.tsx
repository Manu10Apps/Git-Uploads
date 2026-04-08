'use client';

import dynamic from 'next/dynamic';

// ssr: false is only valid in a Client Component, not a Server Component.
// This wrapper allows layout.tsx (Server Component) to use it safely.
const TopBar = dynamic(() => import('@/app/components/TopBar').then((m) => ({ default: m.TopBar })), {
  ssr: false,
  loading: () => <div className="min-h-[40px] bg-neutral-900" aria-hidden="true" />,
});

export function DeferredTopBar() {
  return <TopBar />;
}
