'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiHome, FiFileText, FiLogOut, FiGlobe, FiMenu, FiX } from 'react-icons/fi';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-[rgb(var(--color-bg-primary))] apple-transition">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-[rgb(var(--color-bg-secondary))] border-b border-[rgb(var(--color-border))] px-4 py-3 flex items-center justify-between shadow-apple-md">
        <h1 className="text-xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
          Admin Panel
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-apple hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition touch-manipulation"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <FiX className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
          ) : (
            <FiMenu className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
          )}
        </button>
      </div>

      {/* Sidebar - Apple Style */}
      <aside className={`
        fixed md:static inset-0 z-40 md:z-auto
        w-full md:w-72 
        bg-[rgb(var(--color-bg-secondary))] 
        border-r border-[rgb(var(--color-border))] 
        flex flex-col 
        shadow-apple-lg
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo - Desktop Only */}
        <div className="hidden md:block p-6 lg:p-8 border-b border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-10 h-10">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omegle Logo"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Omegle
            </h1>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Admin Panel
          </p>
        </div>

        {/* Mobile Logo */}
        <div className="md:hidden p-6 border-b border-[rgb(var(--color-border))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omegle Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                  Omegle
                </h1>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Admin Panel
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-apple hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition"
            >
              <FiX className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 md:p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-2xl apple-transition touch-manipulation ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-blue-glow'
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
        <div className="p-4 md:p-6 border-t border-[rgb(var(--color-border))] space-y-2">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-apple text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] hover:text-[rgb(var(--color-text-primary))] apple-transition touch-manipulation"
          >
            <FiGlobe className="w-5 h-5" />
            <span className="font-medium">Public Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-apple text-red-500 dark:text-red-400 hover:bg-red-500/10 apple-transition touch-manipulation"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[rgb(var(--color-bg-primary))]">
        {children}
      </main>
    </div>
  );
}
