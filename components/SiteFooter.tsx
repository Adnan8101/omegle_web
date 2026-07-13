'use client';
import Image from 'next/image';
import Link from 'next/link';
export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-black/10 dark:border-white/10 bg-[rgba(245,245,247,0.4)] dark:bg-[rgba(22,22,23,0.4)] backdrop-blur-md pt-12 pb-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10">
          {}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omeglee Logo"
                  fill
                  className="object-cover rounded-full"
                  unoptimized
                />
              </div>
              <span className="font-[var(--font-display)] text-lg font-semibold tracking-tight text-[rgb(var(--color-text-primary))]">
                Omeglee
              </span>
            </Link>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] leading-relaxed max-w-sm">
              Where connections become conversations. Join the Omeglee Community - A vibrant space with thousands of active members.
            </p>
          </div>
          {}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/donator" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
                  Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/staff-application" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors">
                  Staff Application
                </Link>
              </li>
            </ul>
          </div>
          {}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">
              Community
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] transition-colors flex items-center gap-1.5"
                >
                  Join Discord
                </a>
              </li>
            </ul>
          </div>
        </div>
        {}
        <div className="border-t border-black/5 dark:border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[rgb(var(--color-text-tertiary))] font-light">
          <p>© 2026 Omeglee. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Designed with</span>
            <span className="text-red-500 animate-pulse">❤️</span>
            <span>by Omeglee Community</span>
          </div>
        </div>
      </div>
    </footer>
  );
}