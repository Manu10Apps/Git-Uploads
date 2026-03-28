'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Menu, X, Sun, Moon, Wrench } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import DatabaseStatus from './DatabaseStatus';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useAppStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'sub-admin' | 'editor'>('editor');
  const [isOpen, setIsOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    const adminRole = localStorage.getItem('adminRole');
    if (adminEmail) {
      setEmail(adminEmail);
    }
    if (adminRole === 'admin' || adminRole === 'sub-admin' || adminRole === 'editor') {
      setRole(adminRole);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    router.push('/admin/login');
  };

  const getInitials = (email: string) => {
    if (!email) return 'A';
    return email
      .split('@')[0]
      .split('.')
      .filter((part) => part.length > 0)
      .map((part) => part[0].toUpperCase())
      .join('')
      .slice(0, 2) || 'A';
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'Articles', href: '/admin/articles', roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'Create Article', href: '/admin/create-article', roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'AI Generator', href: '/admin/ai-generator', roles: ['admin'] },
    { label: 'Maintenance', href: '/admin/maintenance', roles: ['admin'] },
    { label: 'Users', href: '/admin/users', roles: ['admin', 'sub-admin'] },
    { label: 'Adverts', href: '/admin/adverts', roles: ['admin'] },
  ].filter((item) => item.roles.includes(role));

  const isDarkMode = theme === 'dark';

  const handleThemeToggle = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <>
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white whitespace-nowrap">Admin Panel</h1>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-red-700 dark:text-red-500'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Database Status */}
            {role === 'admin' && <DatabaseStatus />}

            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-neutral-700" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isNavOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-semibold">
                  {getInitials(email)}
                </div>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isNavOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <nav className="flex flex-col p-4 gap-2">
              <button
                type="button"
                onClick={handleThemeToggle}
                className="text-left px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-900 rounded-lg transition-colors flex items-center gap-2"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? 'Use Light Theme' : 'Use Dark Theme'}
              </button>

              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setIsNavOpen(false);
                  }}
                  className={`text-left px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.href === '/admin/maintenance' && <Wrench className="w-4 h-4" />}
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </>
  );
}

