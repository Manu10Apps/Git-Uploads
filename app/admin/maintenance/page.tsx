'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, CheckCircle2, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import { Footer } from '@/app/components';

const DEFAULT_MESSAGE = 'Turimo gukora ivugurura rito. Turagaruka vuba.';

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
};

export default function MaintenancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [initialSettings, setInitialSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: DEFAULT_MESSAGE,
    updatedAt: null,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMaintenanceSettings = async () => {
      const isAdminAuth = localStorage.getItem('adminAuth');
      const adminEmail = localStorage.getItem('adminEmail') || '';

      if (!isAdminAuth) {
        router.push('/admin/login');
        return;
      }

      try {
        const response = await fetch('/api/admin/maintenance', {
          method: 'GET',
          headers: {
            ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
          },
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load maintenance settings');
        }

        const nextSettings: MaintenanceSettings = {
          enabled: Boolean(data.settings?.enabled),
          message: String(data.settings?.message || DEFAULT_MESSAGE),
          updatedAt: data.settings?.updatedAt || null,
        };

        if (!isMounted) {
          return;
        }

        setEnabled(nextSettings.enabled);
        setMessage(nextSettings.message);
        setSavedAt(nextSettings.updatedAt);
        setInitialSettings(nextSettings);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedbackMessage(error instanceof Error ? error.message : 'Failed to load maintenance settings');
        setSaveStatus('error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMaintenanceSettings();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const hasUnsavedChanges =
    enabled !== initialSettings.enabled ||
    (message.trim() || DEFAULT_MESSAGE) !== initialSettings.message;

  const handleSave = async () => {
    const adminEmail = localStorage.getItem('adminEmail') || '';

    setSaveStatus('saving');
    setFeedbackMessage('');

    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
        body: JSON.stringify({
          enabled,
          message: message.trim() || DEFAULT_MESSAGE,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save maintenance settings');
      }

      const nextSettings: MaintenanceSettings = {
        enabled: Boolean(data.settings?.enabled),
        message: String(data.settings?.message || DEFAULT_MESSAGE),
        updatedAt: data.settings?.updatedAt || new Date().toISOString(),
      };

      setEnabled(nextSettings.enabled);
      setMessage(nextSettings.message);
      setSavedAt(nextSettings.updatedAt);
      setInitialSettings(nextSettings);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (error) {
      setSaveStatus('error');
      setFeedbackMessage(error instanceof Error ? error.message : 'Failed to save maintenance settings');
    }
  };

  const handleReset = () => {
    setEnabled(initialSettings.enabled);
    setMessage(initialSettings.message);
    setSaveStatus('idle');
    setFeedbackMessage('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading maintenance settings...</div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300 mb-3">
                  <Wrench className="w-4 h-4" />
                  Maintenance Control
                </div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white mb-2">Site Maintenance</h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Enable or disable maintenance mode and update the public notice text.
                </p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  enabled
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                }`}
              >
                {enabled ? 'Maintenance ON' : 'Maintenance OFF'}
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <label className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Enable maintenance mode</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Turn this on when you are doing updates or planned downtime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled((value) => !value)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    enabled ? 'bg-red-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                  aria-pressed={enabled}
                  aria-label="Toggle maintenance mode"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <div>
                <label htmlFor="maintenance-message" className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Public maintenance message
                </label>
                <textarea
                  id="maintenance-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Write message visitors should see during maintenance"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || saveStatus === 'saving'}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Save settings'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges || saveStatus === 'saving'}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                {saveStatus === 'saved' && (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved
                  </p>
                )}
                {saveStatus === 'error' && feedbackMessage && (
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{feedbackMessage}</p>
                )}
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                <p className="font-semibold mb-1 inline-flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Current behavior
                </p>
                <p>
                  Maintenance settings are saved on the server and public pages are blocked from the app shell while admin routes remain available.
                </p>
                {savedAt && (
                  <p className="mt-1 opacity-80">Last saved: {new Date(savedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}