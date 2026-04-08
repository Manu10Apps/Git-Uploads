'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu, X, Zap, FileText, FilePlus, BarChart3, Users, Loader2, Wrench, BookOpen, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

type AdminRole = 'admin' | 'sub-admin' | 'editor';

function canAccessAdminPath(role: string, path: string): boolean {
  if (role === 'admin') return true;

  if (role === 'sub-admin') {
    return !['/admin/ai-generator', '/admin/maintenance', '/admin/adverts'].includes(path);
  }

  if (role === 'editor') {
    return !['/admin/ai-generator', '/admin/maintenance', '/admin/adverts', '/admin/users'].includes(path);
  }

  return false;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsChecking(false);
      return;
    }

    const checkAuth = () => {
      try {
        const auth = localStorage.getItem('adminAuth');
        const adminEmail = localStorage.getItem('adminEmail');
        const adminRole = localStorage.getItem('adminRole');
        
        if (!auth) {
          router.push('/admin/login');
        } else {
          const normalizedRole = (adminRole || 'editor') as AdminRole;
          if (!canAccessAdminPath(normalizedRole, pathname)) {
            router.push('/admin/dashboard');
            return;
          }
          setEmail(adminEmail || 'Admin');
          setRole(normalizedRole);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminName');
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'Articles', href: '/admin/articles', icon: FileText, roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'Create Article', href: '/admin/create-article', icon: FilePlus, roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'E-Paper', href: '/admin/epaper', icon: BookOpen, roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'AI Generator', href: '/admin/ai-generator', icon: Zap, roles: ['admin'] },
    { label: 'Maintenance', href: '/admin/maintenance', icon: Wrench, roles: ['admin'] },
    { label: 'Adverts', href: '/admin/adverts', icon: BarChart3, roles: ['admin'] },
    { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin', 'sub-admin'] },
  ].filter((item) => item.roles.includes(role));

  const isActive = (href: string) => pathname === href;

  // Show loading only while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto mb-3" />
          <div className="text-neutral-600 dark:text-neutral-400">Verifying authentication...</div>
        </div>
      </div>
    );
  }

  // Don't render admin layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Don't render layout if not authenticated (redirect in progress)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex">

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, permanent on md+ */}
      <div
        className={`
          fixed h-screen flex flex-col z-40 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}
        `}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between min-h-[56px]">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <h2 className="text-neutral-900 dark:text-white font-bold text-lg truncate pr-2">Admin Panel</h2>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:block text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors ml-auto flex-shrink-0"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors ml-auto flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.href === '/admin/dashboard';
            const isItemActive = isActive(item.href);
            const showLabel = isMobileMenuOpen || isSidebarOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[44px] ${
                  isItemActive
                    ? isDashboard
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-[#f61f00] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={`font-medium truncate ${showLabel ? 'inline' : 'hidden'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate text-center py-2 px-2 bg-neutral-100 dark:bg-neutral-800 rounded">
              {email}
              {role ? ` (${role})` : ''}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-red-700/20 text-red-400 hover:bg-red-700/40 transition-colors text-sm font-medium min-h-[44px]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(isSidebarOpen || isMobileMenuOpen) && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile hamburger — shown when sidebar is off-screen */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}
