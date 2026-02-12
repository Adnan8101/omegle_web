'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden">
      {/* Theme Toggle - Apple Style */}
      <div className="absolute top-8 right-8 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] apple-hover border border-[rgb(var(--color-border))] shadow-apple-md"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <FiSun className="w-5 h-5 text-[rgb(var(--color-text-primary))]" />
          ) : (
            <FiMoon className="w-5 h-5 text-[rgb(var(--color-text-primary))]" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-5xl w-full text-center space-y-16 animate-fade-in">
          {/* Logo/Brand - Apple Style */}
          <div className="space-y-6">
            <h1 className="text-7xl md:text-9xl font-bold tracking-tight text-[rgb(var(--color-text-primary))] animate-slide-up">
              Omegle
            </h1>
            <p className="text-2xl md:text-3xl font-light text-[rgb(var(--color-text-secondary))] tracking-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Discord Community
            </p>
          </div>

          {/* Coming Soon Card - Apple Glass Effect */}
          <div className="glass-effect rounded-apple-xl p-16 border border-[rgb(var(--color-border))] shadow-apple-2xl animate-scale-in backdrop-blur-xl" style={{ animationDelay: '0.2s' }}>
            <div className="space-y-8">
              <h2 className="text-5xl md:text-6xl font-semibold tracking-tight text-[rgb(var(--color-text-primary))]">
                Coming Soon
              </h2>
              <p className="text-xl font-light text-[rgb(var(--color-text-secondary))] max-w-2xl mx-auto leading-relaxed">
                We're crafting something extraordinary. An experience that redefines community connection.
              </p>
              
              {/* Staff Application Link - Apple Button Style */}
              <Link 
                href="/staff-application"
                className="inline-flex items-center gap-3 bg-[rgb(var(--color-accent))] dark:bg-white dark:text-black text-white hover:opacity-80 font-medium px-10 py-5 rounded-apple-lg apple-transition shadow-apple-lg hover:shadow-apple-xl text-lg"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Apply for Staff Position
              </Link>
            </div>
          </div>

          {/* Footer - Apple Style */}
          <div className="text-[rgb(var(--color-text-tertiary))] text-sm font-light animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <p>© 2026 Omegle Discord Community. All rights reserved.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
