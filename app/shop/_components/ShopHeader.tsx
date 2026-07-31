'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown, FiLock, FiLogOut, FiMenu, FiPackage, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { Reveal } from '@/components/motion';

const LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Recent purchases', href: '/recent-purchases' },
  { label: 'Team', href: '/team' },
  { label: 'Staff application', href: '/staff-application' },
];

interface ShopHeaderProps {
  user: { name?: string | null; image?: string | null; id?: string | null } | null;
  authenticated: boolean;
  balance: number;
  currencyEmoji: string;
  currencyName: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * The Shop replaces the global navbar (see FrontendNavbarMount), so this
 * carries both site navigation and the wallet. Same floating pill geometry as
 * the home page's <SiteNavbar> — `#0a0a0f]/85`, `border-white/10`, 52-58px
 * tall — so arriving from Home reads as the same chrome with more in it.
 */
export default function ShopHeader({
  user,
  authenticated,
  balance,
  currencyEmoji,
  currencyName,
  onSignIn,
  onSignOut,
}: ShopHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [profileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header className="fixed top-4 sm:top-5 left-0 right-0 z-50 pointer-events-none">
      <Reveal mount dir="down" distance={18} duration={0.7} className="mx-auto w-[94%] max-w-[980px] pointer-events-auto">
        <div className="h-[52px] sm:h-[58px] px-4 sm:px-6 flex items-center justify-between rounded-full border border-white/10 bg-[#0a0a0f]/85 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <Link href="/" className="nav-brand flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omeglee"
                fill
                className="object-cover rounded-full"
                unoptimized
              />
            </div>
            <span className="hidden sm:block font-semibold text-sm sm:text-base tracking-tight text-white">Omeglee</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href === '/shop' ? 'page' : undefined}
                className={`nav-link text-[14px] font-medium transition-colors ${
                  link.href === '/shop' ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0" ref={profileRef}>
            {authenticated ? (
              <>
                <div
                  className="flex items-center gap-2 rounded-full border border-[#3B9EFF]/25 bg-gradient-to-r from-[#3B9EFF]/15 to-[#3B9EFF]/5 py-1.5 pl-2 pr-3"
                  title={`Your ${currencyName} balance`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B9EFF]/15">
                    <CurrencyMark emoji={currencyEmoji} size={13} />
                  </span>
                  <span className="text-[13px] font-bold text-white">{balance.toLocaleString()}</span>
                </div>

                <Link
                  href="/purchases"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[12.5px] font-semibold text-white/80 transition-colors hover:text-white hover:bg-white/5"
                >
                  <FiPackage className="h-3.5 w-3.5" />
                  My stuff
                </Link>

                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-full p-[3px] transition-colors hover:bg-white/5"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <img
                    src={user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user?.name || 'Your avatar'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <FiChevronDown
                    className="hidden sm:block h-3.5 w-3.5 text-white/50 transition-transform duration-300"
                    style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 top-[calc(100%+10px)] w-56 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-2xl shadow-2xl p-1.5"
                    >
                      <div className="px-3 pb-2 pt-2">
                        <p className="truncate text-[13px] font-bold text-white">{user?.name || 'Discord user'}</p>
                      </div>
                      <div className="h-px bg-white/10" />
                      <Link
                        href="/purchases"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <FiPackage className="h-4 w-4 text-[#3B9EFF]" />
                        My purchases
                      </Link>
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <FiLock className="h-4 w-4 text-white/50" />
                        Admin panel
                      </Link>
                      <div className="my-1 h-px bg-white/10" />
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <FiLogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-3.5 sm:px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#4752C4]"
              >
                <FaDiscord className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:bg-white/5 lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <FiX className="h-4 w-4" /> : <FiMenu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#09090b]/95 backdrop-blur-xl p-2 shadow-2xl lg:hidden"
            >
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3.5 py-3 text-[14px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
              >
                Home
              </Link>
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-colors hover:bg-white/5 ${
                    link.href === '/shop' ? 'text-white' : 'text-white/75'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {authenticated && (
                <Link
                  href="/purchases"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3.5 py-3 text-[14px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                >
                  My stuff
                </Link>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </Reveal>
    </header>
  );
}
