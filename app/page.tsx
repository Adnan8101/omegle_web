'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { FiSun, FiMoon, FiUsers, FiShield, FiZap } from 'react-icons/fi';

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden">
      {/* Background - Blue blobs only in light mode */}
      {theme === 'light' && (
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
          <div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-blue-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-20 w-[500px] h-[500px] bg-blue-400/15 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
      )}

      {/* Banner Video */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 md:pt-28 mb-8 animate-fade-in">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]">
          <video 
            className="w-full h-auto"
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src="/Discord:Omegle.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 sm:p-3.5 rounded-2xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 apple-hover border border-[rgb(var(--color-border))] shadow-apple-md touch-manipulation hover:shadow-blue-glow backdrop-blur-xl will-change-transform"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <FiSun className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          ) : (
            <FiMoon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl w-full text-center space-y-8 sm:space-y-10 md:space-y-12 animate-fade-in">
          
          {/* Large Prominent Logo Banner */}
          <div className="flex justify-center animate-slide-down mb-8">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 drop-shadow-2xl will-change-transform">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omeglee Community Logo"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Brand Title */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 dark:from-white dark:via-gray-200 dark:to-white animate-slide-up will-change-transform">
              Omeglee
            </h1>
            <div className="space-y-2">
              <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-blue-600 dark:text-white tracking-tight animate-slide-up will-change-transform" style={{ animationDelay: '0.1s' }}>
                Community
              </p>
              <p className="text-base sm:text-lg md:text-xl text-[rgb(var(--color-text-tertiary))] font-light max-w-2xl mx-auto animate-slide-up will-change-transform" style={{ animationDelay: '0.15s' }}>
                Where connections become conversations
              </p>
            </div>
          </div>

          {/* Features Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto animate-scale-in will-change-transform" style={{ animationDelay: '0.2s' }}>
            <div className="glass-blue rounded-2xl p-6 border border-blue-500/20 dark:border-white/10 hover:shadow-blue-glow apple-transition backdrop-blur-xl group will-change-transform">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-500/10 dark:bg-white/5 rounded-2xl group-hover:scale-110 apple-transition will-change-transform">
                  <FiUsers className="w-8 h-8 text-blue-600 dark:text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-2">Active Community</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">Join thousands of members worldwide</p>
            </div>
            
            <div className="glass-blue rounded-2xl p-6 border border-blue-500/20 dark:border-white/10 hover:shadow-blue-glow apple-transition backdrop-blur-xl group will-change-transform">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-500/10 dark:bg-white/5 rounded-2xl group-hover:scale-110 apple-transition will-change-transform">
                  <FiShield className="w-8 h-8 text-blue-600 dark:text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-2">Safe & Moderated</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">24/7 professional moderation team</p>
            </div>
            
            <div className="glass-blue rounded-2xl p-6 border border-blue-500/20 dark:border-white/10 hover:shadow-blue-glow apple-transition backdrop-blur-xl group will-change-transform">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-500/10 dark:bg-white/5 rounded-2xl group-hover:scale-110 apple-transition will-change-transform">
                  <FiZap className="w-8 h-8 text-blue-600 dark:text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-2">Always Active</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">Vibrant discussions 24/7</p>
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="glass-blue rounded-3xl p-8 sm:p-10 md:p-12 lg:p-16 border border-blue-500/30 dark:border-white/10 shadow-blue-glow animate-scale-in backdrop-blur-xl hover:border-blue-500/50 dark:hover:border-white/20 apple-transition will-change-transform" style={{ animationDelay: '0.3s' }}>
            <div className="space-y-6 sm:space-y-7 md:space-y-8">
              <div className="inline-flex items-center justify-center px-6 py-2 bg-blue-500/20 dark:bg-white/10 rounded-full border border-blue-500/30 dark:border-white/20 mb-4">
                <span className="text-blue-600 dark:text-white font-semibold text-sm">Coming Soon</span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">
                Something Epic
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-[rgb(var(--color-text-secondary))] max-w-3xl mx-auto leading-relaxed px-2">
                We're crafting an extraordinary experience that will redefine how communities connect and engage.
              </p>
              
              {/* Staff Application Link */}
              <div className="pt-4">
                <Link 
                  href="/staff-application"
                  className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 dark:from-white dark:to-gray-200 dark:hover:from-gray-200 dark:hover:to-white text-white dark:text-black active:scale-95 font-semibold px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-2xl apple-transition shadow-blue-glow hover:shadow-xl text-base sm:text-lg md:text-xl touch-manipulation w-full sm:w-auto group will-change-transform">
                >
                  <svg 
                    className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-12 apple-transition will-change-transform" 
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
                  <span className="whitespace-nowrap">Join Our Staff Team</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-[rgb(var(--color-text-tertiary))] text-sm font-light animate-fade-in space-y-3 pt-8" style={{ animationDelay: '0.4s' }}>
            <p className="text-base">© 2026 Omeglee Community. All rights reserved.</p>
            <a href="https://discord.gg/omegle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-blue-600 dark:hover:text-white apple-transition text-base">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
