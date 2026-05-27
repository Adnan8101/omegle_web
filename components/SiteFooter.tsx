'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function SiteFooter() {
  const socials = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/omeglee.discord',
      hoverClass: 'hover:bg-gradient-to-tr hover:from-yellow-500/10 hover:via-red-500/10 hover:to-purple-600/10 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(225,48,108,0.2)]',
      icon: (
        <svg className="w-5 h-5 text-[#E1306C]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      )
    },
    {
      name: 'Reddit',
      url: 'https://www.reddit.com/u/omeglee-discord/s/9gUBMe9th9',
      hoverClass: 'hover:bg-[#FF4500]/10 hover:border-[#FF4500]/30 hover:shadow-[0_0_15px_rgba(255,69,0,0.2)]',
      icon: (
        <svg className="w-5 h-5 text-[#FF4500]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.18 8.87c0-1.12-.91-2.03-2.03-2.03-.39 0-.75.11-1.07.3C12.87 6.47 11.34 6 9.61 5.92l.85-2.69 2.37.5c0 .6.49 1.08 1.09 1.08a1.09 1.09 0 0 0 0-2.18c-.6 0-1.09.49-1.09 1.08L10.3 3.09c-.06-.01-.12.01-.17.06-.05.04-.07.11-.05.17l-.92 2.92C7.38 6.33 5.82 6.8 4.6 7.4c-.31-.19-.67-.3-1.06-.3A2.03 2.03 0 0 0 1.5 9.13c0 .8.46 1.48 1.13 1.82-.04.22-.06.44-.06.66 0 2.45 2.85 4.43 6.37 4.43s6.37-1.98 6.37-4.43c0-.22-.02-.44-.06-.66.67-.34 1.13-1.02 1.13-1.82zM4.93 10.34c0-.6.49-1.09 1.09-1.09.6 0 1.09.49 1.09 1.09s-.49 1.09-1.09 1.09a1.09 1.09 0 0 1-1.09-1.09zm7.3 2.76c-.84.84-2.44.84-3.28 0a.44.44 0 1 1 .63-.63c.5.5 1.52.5 2.02 0a.44.44 0 0 1 .63.63zm.06-2.76c0-.6.49-1.09 1.09-1.09.6 0 1.09.49 1.09 1.09s-.49 1.09-1.09 1.09a1.09 1.09 0 0 1-1.09-1.09z"/>
        </svg>
      )
    },
    {
      name: 'Youtube',
      url: 'https://www.youtube.com/@omeglee.discord',
      hoverClass: 'hover:bg-[#FF0000]/10 hover:border-[#FF0000]/30 hover:shadow-[0_0_15px_rgba(255,0,0,0.2)]',
      icon: (
        <svg className="w-5 h-5 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/omeglee.discord',
      hoverClass: 'hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30 hover:shadow-[0_0_15px_rgba(24,119,242,0.2)]',
      icon: (
        <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: 'X',
      url: 'https://x.com/omegleediscord?s=21',
      hoverClass: 'hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/30 dark:hover:border-white/30',
      icon: (
        <svg className="w-4 h-4 text-black dark:text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    }
  ];

  return (
    <footer className="w-full border-t border-black/10 dark:border-white/10 bg-[rgba(245,245,247,0.4)] dark:bg-[rgba(22,22,23,0.4)] backdrop-blur-md pt-12 pb-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omeglee Logo"
                  fill
                  className="object-contain"
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
            
            {/* Social Icons Row */}
            <div className="flex flex-wrap gap-2 pt-2">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 ${social.hoverClass}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
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

          {/* Links Column 2 */}
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
              <li>
                <span className="text-[rgb(var(--color-text-secondary))] select-none">
                  Support Server
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
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
