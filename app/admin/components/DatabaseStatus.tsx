'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

type DatabaseStatusType = 'connected' | 'degraded' | 'unknown';

export default function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatusType>('unknown');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        // Test database connection by making a simple maintenance API call
        const response = await fetch('/api/admin/maintenance', {
          method: 'GET',
          headers: {
            'x-admin-email': localStorage.getItem('adminEmail') || '',
          },
        });

        const data = await response.json();

        if (data.degraded) {
          setStatus('degraded');
          setMessage('Using Fallback Storage (Database Unavailable)');
        } else if (response.ok) {
          setStatus('connected');
          setMessage('PostgreSQL Database Connected');
        } else {
          setStatus('unknown');
          setMessage('Database Status Unknown');
        }
      } catch (error) {
        setStatus('degraded');
        setMessage('Using Fallback Storage (Connection Failed)');
      }
    };

    checkDatabaseStatus();
    // Check every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
        status === 'connected'
          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
          : status === 'degraded'
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
      }`}
    >
      {status === 'connected' ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{message}</span>
    </div>
  );
}
