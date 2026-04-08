import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'ky' | 'en' | 'sw';

interface AppState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'ky',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        set({ language });
        // Sync to cookie so middleware/SSR can read the preference
        if (typeof window !== 'undefined') {
          document.cookie = `preferred-lang=${language};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
          // Update html lang attribute instantly
          document.documentElement.lang = language === 'ky' ? 'rw' : language;
          window.dispatchEvent(new CustomEvent('languageChange', { detail: { language } }));
        }
      },
    }),
    {
      name: 'amakuru-app-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
    }
  )
);

// Article-related types
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  category: 'politics' | 'business' | 'technology' | 'investigations' | 'culture' | 'sports';
  author: string;
  authorImage: string;
  publishedAt: string;
  updatedAt: string;
  readTime: number;
  tags: string[];
  sources: string[];
  featured: boolean;
  language: Language;
}

// User preferences
export interface UserPreferences {
  theme: Theme;
  language: Language;
  newsletters: string[];
  savedArticles: string[];
}
