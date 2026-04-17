'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';

interface DiagnosticReport {
  success: boolean;
  report?: {
    article: Record<string, any>;
    imageProcessing: Record<string, any>;
    imageAccessibility: Record<string, any>;
    generatedMetaTags: Record<string, any>;
    diagnostics: {
      readyForSharing: boolean;
      issues: string[];
      recommendations: string[];
    };
  };
  testUrlsForManualValidation?: Record<string, string>;
  error?: string;
}

export default function SocialMediaVerificationPage() {
  const [slug, setSlug] = useState('');
  const [lang, setLang] = useState('ky');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      alert('Please enter an article slug');
      return;
    }

    setLoading(true);
    setReport(null);
    try {
      const response = await fetch(
        `/api/admin/social-media-debug?slug=${encodeURIComponent(slug)}&lang=${lang}`
      );
      const data = await response.json();
      setReport(data);
    } catch (error) {
      setReport({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminHeader title="Social Media Link Preview Verification" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Test Article Sharing Metadata
          </h2>
          
          <form onSubmit={handleTest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Article Slug *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., breaking-news-headline"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Language
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700"
                >
                  <option value="ky">Kinyarwanda</option>
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Testing...' : 'Test Sharing'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        {report && (
          <div className="space-y-6">
            {report.error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                    <p className="text-sm text-red-800 dark:text-red-200">{report.error}</p>
                  </div>
                </div>
              </div>
            ) : report.report ? (
              <>
                {/* Status Summary */}
                <div className={`rounded-lg p-6 border-2 ${
                  report.report.diagnostics.readyForSharing
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {report.report.diagnostics.readyForSharing ? (
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                    )}
                    <div>
                      <h3 className={`font-semibold ${
                        report.report.diagnostics.readyForSharing
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-yellow-900 dark:text-yellow-100'
                      }`}>
                        {report.report.diagnostics.readyForSharing
                          ? '✅ Ready for Social Media Sharing'
                          : '⚠️  Issues Found - See Below'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        report.report.diagnostics.readyForSharing
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {report.report.diagnostics.readyForSharing
                          ? 'Article will display thumbnail on Facebook, Twitter, LinkedIn, WhatsApp, etc.'
                          : 'Article may not display thumbnail on social media platforms.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {report.report.diagnostics.issues.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                      Issues ({report.report.diagnostics.issues.length})
                    </h3>
                    <ul className="space-y-2">
                      {report.report.diagnostics.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-neutral-400 flex-shrink-0">•</span>
                          <span className="text-neutral-700 dark:text-neutral-300">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {report.report.diagnostics.recommendations.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {report.report.diagnostics.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                          <span className="flex-shrink-0">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Image Analysis */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                    Image Analysis
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-neutral-600 dark:text-neutral-400">Raw Image:</span>
                      <span className="text-neutral-900 dark:text-white break-all text-right max-w-xs">
                        {report.report.imageProcessing.rawImage || '(none)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-neutral-600 dark:text-neutral-400">Resolved URL:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-900 dark:text-white break-all text-right max-w-xs">
                          {report.report.imageProcessing.resolvedUrl}
                        </span>
                        <button
                          onClick={() => copyToClipboard(report.report.imageProcessing.resolvedUrl, 'url')}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                        >
                          {copied === 'url' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-neutral-500" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-neutral-600 dark:text-neutral-400">Valid URL:</span>
                      <span className={report.report.imageProcessing.isValid ? 'text-green-600' : 'text-red-600'}>
                        {report.report.imageProcessing.isValid ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-neutral-600 dark:text-neutral-400">Accessible:</span>
                      <span className={report.report.imageAccessibility.accessible ? 'text-green-600' : 'text-red-600'}>
                        {report.report.imageAccessibility.accessible
                          ? `✅ HTTP ${report.report.imageAccessibility.statusCode}`
                          : `❌ HTTP ${report.report.imageAccessibility.statusCode}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meta Tags */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                    Generated Meta Tags
                  </h3>
                  <div className="space-y-6">
                    {/* OG Tags */}
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Open Graph (Facebook, LinkedIn)
                      </h4>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 text-xs font-mono space-y-1">
                        {Object.entries(report.report.generatedMetaTags.openGraph).map(([key, value]) => (
                          <div key={key} className="text-neutral-600 dark:text-neutral-400">
                            <span className="text-red-600">property</span>={key} <span className="text-orange-600">content</span>=
                            <span className="text-green-600">"{String(value).substring(0, 60)}{String(value).length > 60 ? '...' : ''}"</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Twitter Card */}
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Twitter Card
                      </h4>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 text-xs font-mono space-y-1">
                        {Object.entries(report.report.generatedMetaTags.twitter).map(([key, value]) => (
                          <div key={key} className="text-neutral-600 dark:text-neutral-400">
                            <span className="text-red-600">name</span>={key} <span className="text-orange-600">content</span>=
                            <span className="text-green-600">"{String(value).substring(0, 60)}{String(value).length > 60 ? '...' : ''}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Validation Links */}
                {report.testUrlsForManualValidation && (
                  <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                      Validate on Social Platforms
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(report.testUrlsForManualValidation).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <span className="font-medium text-neutral-900 dark:text-white capitalize">
                            {platform} Debugger
                          </span>
                          <ExternalLink className="w-4 h-4 text-neutral-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
