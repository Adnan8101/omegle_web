'use client';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
export default function Home() {
  const { theme } = useTheme();
  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden">
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover opacity-30 dark:opacity-15"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/Discord:Omegle.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--color-bg-primary))]/80 via-[rgb(var(--color-bg-primary))]/50 to-[rgb(var(--color-bg-primary))]"></div>
        </div>
        {theme === 'light' && (
          <div className="absolute inset-0">
            <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-sky-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-55 animate-float"></div>
            <div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-blue-300/15 rounded-full mix-blend-multiply filter blur-3xl opacity-55 animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute -bottom-8 left-20 w-[500px] h-[500px] bg-indigo-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" style={{ animationDelay: '4s' }}></div>
          </div>
        )}
        <div className="relative z-10 max-w-6xl w-full px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center space-y-8 sm:space-y-10 md:space-y-12 animate-fade-in">
            <div className="flex justify-center animate-slide-down mb-8">
              <div className="relative group cursor-pointer">
                {}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full blur-2xl opacity-60 group-hover:opacity-85 transition-opacity duration-500 animate-pulse"></div>
                {}
                <div
                  className="absolute -inset-1.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 rounded-full opacity-95 group-hover:scale-105 transition-all duration-500 shadow-blue-glow"
                  style={{ animation: 'spin 12s linear infinite' }}
                ></div>
                {}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-black dark:bg-[rgb(var(--color-bg-secondary))] rounded-full overflow-hidden border-[3px] border-white/90 dark:border-white/15 flex items-center justify-center shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                  <Image
                    src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                    alt="Omeglee Community Logo"
                    fill
                    className="object-cover rounded-full scale-102 transform group-hover:scale-110 transition-transform duration-500"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-[rgb(var(--color-text-primary))] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white animate-slide-up will-change-transform">
                Omeglee
              </h1>
              <div className="space-y-2">
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-[rgb(var(--color-text-secondary))] dark:text-white tracking-tight animate-slide-up will-change-transform" style={{ animationDelay: '0.1s' }}>
                  Community
                </p>
                <p className="text-sm sm:text-base md:text-lg text-[rgb(var(--color-text-tertiary))] font-light max-w-2xl mx-auto animate-slide-up will-change-transform" style={{ animationDelay: '0.15s' }}>
                  Where connections become conversations
                </p>
              </div>
            </div>
            <div className="max-w-2xl mx-auto animate-scale-in will-change-transform" style={{ animationDelay: '0.2s' }}>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="block glass-blue rounded-3xl p-8 sm:p-10 md:p-12 border border-[rgb(var(--color-border))] dark:border-white/10 shadow-apple-lg hover:shadow-xl backdrop-blur-xl hover:border-[rgb(var(--color-accent))] dark:hover:border-white/20 apple-transition group will-change-transform"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="p-5 bg-[rgb(var(--color-bg-tertiary))] dark:bg-white/5 rounded-3xl group-hover:scale-110 apple-transition">
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[rgb(var(--color-accent))] dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-3 group-hover:text-[rgb(var(--color-accent))] dark:group-hover:text-white apple-transition">
                      Join Our Discord
                    </h2>
                    <p className="text-base sm:text-lg text-[rgb(var(--color-text-secondary))] max-w-lg mx-auto">
                      Connect with thousands of members, participate in events, and be part of our vibrant community
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-[rgb(var(--color-accent))] dark:text-white font-semibold group-hover:gap-3 apple-transition">
                    <span>Join Discord Server</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="relative bg-[rgb(var(--color-bg-primary))] py-16 sm:py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="glass-blue rounded-3xl p-8 sm:p-10 md:p-12 lg:p-16 border border-[rgb(var(--color-border))] dark:border-white/10 shadow-apple-lg animate-scale-in backdrop-blur-xl hover:border-[rgb(var(--color-accent))] dark:hover:border-white/20 apple-transition will-change-transform">
            <div className="space-y-6 sm:space-y-7 md:space-y-8 text-center">
              <div className="inline-flex items-center justify-center px-6 py-2 bg-[rgb(var(--color-bg-tertiary))] dark:bg-white/10 rounded-full border border-[rgb(var(--color-border))] dark:border-white/20 mb-4">
                <span className="text-[rgb(var(--color-text-secondary))] dark:text-white font-semibold text-sm">Coming Soon</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">
                Something Epic
              </h2>
              <p className="text-base sm:text-lg md:text-xl font-light text-[rgb(var(--color-text-secondary))] max-w-3xl mx-auto leading-relaxed">
                We're crafting an extraordinary experience that will redefine how communities connect and engage.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/staff-application"
                  className="inline-flex items-center justify-center gap-3 bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))] dark:from-white dark:to-gray-200 dark:hover:from-gray-200 dark:hover:to-white text-white dark:text-black active:scale-95 font-semibold px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-2xl apple-transition shadow-blue-glow hover:shadow-xl text-base sm:text-lg md:text-xl touch-manipulation w-full sm:w-auto group will-change-transform"
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
                <Link
                  href="/donator"
                  className="inline-flex items-center justify-center gap-3 bg-transparent border-2 border-[rgb(var(--color-border))] dark:border-white hover:bg-[rgb(var(--color-bg-tertiary))] dark:hover:bg-white/10 text-[rgb(var(--color-text-primary))] dark:text-white active:scale-95 font-semibold px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-2xl apple-transition text-base sm:text-lg md:text-xl touch-manipulation w-full sm:w-auto group will-change-transform"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 apple-transition will-change-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="whitespace-nowrap">Subscription Plans</span>
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-3 bg-transparent border-2 border-[rgb(var(--color-border))] dark:border-white hover:bg-[rgb(var(--color-bg-tertiary))] dark:hover:bg-white/10 text-[rgb(var(--color-text-primary))] dark:text-white active:scale-95 font-semibold px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-2xl apple-transition text-base sm:text-lg md:text-xl touch-manipulation w-full sm:w-auto group will-change-transform"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 apple-transition will-change-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4m0 0L5 5m2 8l-1.2 6.2A1 1 0 006.8 20h10.4a1 1 0 001-.8L20 13M9 22a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  <span className="whitespace-nowrap">Shop</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}