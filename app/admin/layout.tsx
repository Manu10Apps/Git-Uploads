'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu, X, Zap, FileText, BarChart3, Users, Loader2, Wrench } from 'lucide-react';
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
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminName');
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Articles', href: '/admin/articles', icon: FileText, roles: ['admin', 'sub-admin', 'editor'] },
    { label: 'Create Article', href: '/admin/create-article', icon: FileText, roles: ['admin', 'sub-admin', 'editor'] },
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
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } hidden lg:flex bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 fixed h-screen flex-col z-40`}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          {isSidebarOpen && <h2 className="text-neutral-900 dark:text-white font-bold text-lg">Admin Panel</h2>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-red-700 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          {isSidebarOpen && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate text-center py-2 px-2 bg-neutral-100 dark:bg-neutral-800 rounded">
              {email}
              {role ? ` (${role})` : ''}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/20 text-red-400 hover:bg-red-700/40 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      <div className={`${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} ml-0 flex-1 transition-all duration-300`}>
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}
