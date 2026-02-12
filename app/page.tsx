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
          <div className="text-[rgb(var(--color-text-tertiary))] text-sm font-light animate-fade-in space-y-2" style={{ animationDelay: '0.4s' }}>
            <p>© 2026 Omegle. All rights reserved.</p>
            <a href="https://discord.gg/omegle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[rgb(var(--color-text-secondary))] apple-transition">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              discord.gg/omegle
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
