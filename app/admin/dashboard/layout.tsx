'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiFileText, FiLogOut, FiGlobe } from 'react-icons/fi';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (!auth && pathname !== '/admin') {
      router.push('/admin');
    } else {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [router, pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[rgb(var(--color-accent))] border-t-transparent"></div>
      </div>
    );
  }

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: <FiHome className="w-5 h-5" />,
    },
    {
      name: 'Staff Applications',
      href: '/admin/dashboard/applications',
      icon: <FiFileText className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[rgb(var(--color-bg-primary))] apple-transition">
      {/* Sidebar - Apple Style */}
      <aside className="w-72 bg-[rgb(var(--color-bg-secondary))] border-r border-[rgb(var(--color-border))] flex flex-col shadow-apple-lg">
        {/* Logo */}
        <div className="p-8 border-b border-[rgb(var(--color-border))]">
          <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
            Admin Panel
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-2 font-light">
            Omegle Management
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-apple apple-transition ${ isActive
                    ? 'bg-[rgb(var(--color-accent))] dark:bg-white text-white dark:text-black shadow-apple-md'
                    : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] hover:text-[rgb(var(--color-text-primary))]'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-[rgb(var(--color-border))] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-4 px-5 py-4 rounded-apple text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] hover:text-[rgb(var(--color-text-primary))] apple-transition"
          >
            <FiGlobe className="w-5 h-5" />
            <span className="font-medium">Public Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-apple text-red-500 dark:text-red-400 hover:bg-red-500/10 apple-transition"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[rgb(var(--color-bg-primary))]">
        {children}
      </main>
    </div>
  );
}
