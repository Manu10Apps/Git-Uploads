'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader, Copy, Check, AlertCircle } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (prompt: string, options?: { model?: string }) => Promise<any>;
      };
    };
  }
}

interface GeneratedArticle {
  title: string;
  content: string;
  excerpt: string;
  readTime: number;
  language: string;
}

export default function AIGeneratorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    topic: '',
    tone: 'journalistic' as 'professional' | 'journalistic' | 'casual',
    language: 'en' as 'en' | 'ky' | 'sw',
  });

  const [generated, setGenerated] = useState<GeneratedArticle | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [puterReady, setPuterReady] = useState(false);

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    const adminRole = localStorage.getItem('adminRole') || 'editor';
    if (!isAdminAuth) {
      router.push('/admin/login');
    } else if (adminRole !== 'admin') {
      setIsForbidden(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);

      if (window.puter?.ai?.chat) {
        setPuterReady(true);
        return;
      }

      const existingScript = document.querySelector('script[data-puter-sdk="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setPuterReady(Boolean(window.puter?.ai?.chat)));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.setAttribute('data-puter-sdk', 'true');
      script.onload = () => setPuterReady(Boolean(window.puter?.ai?.chat));
      script.onerror = () => {
        setPuterReady(false);
        setMessage({ type: 'error', text: 'Failed to load Puter AI SDK.' });
      };
      document.body.appendChild(script);
    }
  }, [router]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.topic.trim()) {
      setMessage({ type: 'error', text: 'Please fill in title and topic' });
      return;
    }

    if (!window.puter?.ai?.chat) {
      setMessage({ type: 'error', text: 'Puter AI is not ready. Please wait and try again.' });
      return;
    }

    setIsGenerating(true);
    try {
      const languageName =
        form.language === 'ky' ? 'Kinyarwanda' : form.language === 'sw' ? 'Swahili' : 'English';

      const prompt = `You are a professional news writer for AMAKURU24.
Write in ${languageName} with a ${form.tone} tone.

Article Title: ${form.title}
Topic: ${form.topic}

Requirements:
- 400-600 words
- Clear news structure (intro, key points, conclusion)
- Factual and readable
- Return plain text markdown content only.`;

      const response = await window.puter.ai.chat(prompt, { model: 'gpt-5-nano' });
      const content = String(response ?? '').trim();

      if (!content) {
        setMessage({ type: 'error', text: 'AI returned empty content.' });
        return;
      }

      const excerpt = content.replace(/[#*_`]/g, '').substring(0, 180).trim();
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));

      setGenerated({
        title: form.title.trim(),
        content,
        excerpt: excerpt + (excerpt.length === 180 ? '...' : ''),
        readTime,
        language: form.language,
      });
      setMessage({ type: 'success', text: 'Article generated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate article' });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <>
        <AdminHeader />
        <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Access Restricted</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-5">Only full admins can use AI Generator.</p>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-yellow-500" />
              <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white">
                AI News Generator
              </h1>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              Generate quality news articles using AI. Perfect for quick article drafts!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
                Article Details
              </h2>

              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      message.type === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                  <p
                    className={
                      message.type === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }
                  >
                    {message.text}
                  </p>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Article Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Rwanda's Tech Sector Growth Accelerates"
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Topic / Keyword
                  </label>
                  <textarea
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="Describe the topic, key points, or context for the article..."
                    rows={4}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-700 resize-none"
                  />
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={form.tone}
                    onChange={(e) => setForm({ ...form, tone: e.target.value as any })}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    <option value="journalistic">Journalistic</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Language
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value as any })}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    <option value="en">English</option>
                    <option value="ky">Kinyarwanda</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isGenerating || !puterReady}
                  className="w-full px-6 py-3 bg-red-700 hover:bg-red-800 disabled:bg-neutral-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : !puterReady ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Loading AI...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Article
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Output Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
                Generated Content
              </h2>

              {generated ? (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Title
                    </h3>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-lg font-semibold text-neutral-900 dark:text-white">
                        {generated.title}
                      </p>
                      <button
                        onClick={() => copyToClipboard(generated.title, 'title')}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                      >
                        {copied === 'title' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Excerpt
                    </h3>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {generated.excerpt}
                      </p>
                      <button
                        onClick={() => copyToClipboard(generated.excerpt, 'excerpt')}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex-shrink-0"
                      >
                        {copied === 'excerpt' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Content
                      </h3>
                      <button
                        onClick={() => copyToClipboard(generated.content, 'content')}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                      >
                        {copied === 'content' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert">
                      {generated.content.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-3">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Read Time</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {generated.readTime} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Language</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white uppercase">
                        {generated.language}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <Zap className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                    Fill in the form to generate an article
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
