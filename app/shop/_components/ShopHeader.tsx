'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiChevronDown, FiLock, FiLogOut, FiMenu, FiPackage, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { Reveal } from '@/components/motion';
import AnimatedNumber from './AnimatedNumber';

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
  balanceReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * The Shop replaces the global navbar (see FrontendNavbarMount), so this dock
 * carries both site navigation and the wallet. Geometry deliberately matches
 * the home page's floating pill — same height, same radius, same blur — so
 * arriving from Home reads as the same chrome, just with more in it.
 */
export default function ShopHeader({
  user,
  authenticated,
  balance,
  currencyEmoji,
  currencyName,
  balanceReady,
  onSignIn,
  onSignOut,
}: ShopHeaderProps) {
  const reduce = useReducedMotion();
  const [condensed, setCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [profileOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40 sm:top-5">
      <Reveal mount dir="down" distance={18} duration={0.7} className="pointer-events-auto mx-auto w-[94%] max-w-[1120px]">
        <div
          className="flex items-center justify-between gap-3 rounded-full border px-3 pl-4 sm:px-4 sm:pl-5"
          style={{
            height: condensed ? 56 : 60,
            borderColor: condensed ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.06)',
            background: condensed ? 'rgba(9,9,16,0.82)' : 'rgba(9,9,16,0.42)',
            backdropFilter: 'blur(26px) saturate(160%)',
            WebkitBackdropFilter: 'blur(26px) saturate(160%)',
            boxShadow: condensed ? '0 18px 48px -26px rgba(0,0,0,1)' : 'none',
            transition: reduce
              ? 'none'
              : 'height 340ms var(--sx-ease), background 340ms var(--sx-ease), box-shadow 340ms var(--sx-ease), border-color 340ms var(--sx-ease)',
          }}
        >
          {/* ── Brand ─────────────────────────────────────────────── */}
          <Link href="/" className="nav-brand flex flex-shrink-0 items-center gap-2.5" aria-label="Omeglee home">
            <span className="relative block h-7 w-7 overflow-hidden rounded-full sm:h-[30px] sm:w-[30px]">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-[-0.02em] text-[var(--sx-ink)] sm:block">
              Omeglee
            </span>
            <span
              className="hidden items-center rounded-full border px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.16em] lg:inline-flex"
              style={{
                borderColor: 'rgba(124,106,245,0.32)',
                background: 'rgba(124,106,245,0.13)',
                color: '#b5aaff',
              }}
            >
              Shop
            </span>
          </Link>

          {/* ── Links ─────────────────────────────────────────────── */}
          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const active = link.href === '/shop';
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className="sx-focus group relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors"
                  style={{ color: active ? 'var(--sx-ink)' : 'var(--sx-ink-2)' }}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09)',
                      }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                  {!active && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-3.5 right-3.5 h-[1.5px] origin-left scale-x-0 rounded-full transition-transform duration-[340ms] ease-[var(--sx-ease)] group-hover:scale-x-100"
                      style={{ background: 'linear-gradient(90deg,#7C6AF5,#3B9EFF)' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Wallet + account ──────────────────────────────────── */}
          <div className="flex flex-shrink-0 items-center gap-2" ref={profileRef}>
            {authenticated ? (
              <>
                <div
                  className="relative flex items-center gap-2.5 overflow-hidden rounded-full border py-1.5 pl-2 pr-3.5"
                  style={{
                    borderColor: 'rgba(246,185,59,0.24)',
                    background: 'linear-gradient(120deg, rgba(246,185,59,0.16), rgba(246,185,59,0.04) 62%)',
                  }}
                  title={`Your ${currencyName} balance`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: 'rgba(246,185,59,0.16)' }}
                  >
                    <CurrencyMark emoji={currencyEmoji} size={14} />
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-[rgba(246,185,59,0.72)]">
                      Balance
                    </span>
                    {balanceReady ? (
                      <span className="mt-[3px] text-[13.5px] font-extrabold text-[#ffd77a]">
                        <AnimatedNumber value={balance} />
                      </span>
                    ) : (
                      <span className="sx-skel mt-[4px] block h-3 w-12 rounded-full" />
                    )}
                  </span>
                </div>

                <Link
                  href="/purchases"
                  className="sx-focus hidden items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors md:inline-flex"
                  style={{ borderColor: 'var(--sx-hair)', color: 'var(--sx-ink-2)' }}
                  title="Everything you own"
                >
                  <FiPackage className="h-3.5 w-3.5" style={{ color: '#8fbcff' }} />
                  My stuff
                </Link>

                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="sx-focus flex items-center gap-1.5 rounded-full p-[3px] transition-colors hover:bg-white/5"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <img
                    src={user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user?.name || 'Your avatar'}
                    className="h-8 w-8 rounded-full object-cover"
                    style={{ boxShadow: '0 0 0 1.5px rgba(124,106,245,0.45)' }}
                  />
                  <FiChevronDown
                    className="hidden h-3.5 w-3.5 transition-transform duration-300 sm:block"
                    style={{ color: 'var(--sx-ink-3)', transform: profileOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      role="menu"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="sx-panel-solid absolute right-0 top-[calc(100%+10px)] w-[236px] origin-top-right overflow-hidden p-1.5"
                      style={{ borderRadius: 'var(--sx-r-md)' }}
                    >
                      <div className="px-3 pb-2.5 pt-2">
                        <p className="truncate text-[13px] font-bold text-[var(--sx-ink)]">
                          {user?.name || 'Discord user'}
                        </p>
                        <p className="sx-mono mt-0.5 truncate text-[10.5px] text-[var(--sx-ink-4)]">
                          {user?.id || ''}
                        </p>
                      </div>
                      <div className="h-px" style={{ background: 'var(--sx-hair)' }} />
                      <Link
                        href="/purchases"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1.5 flex items-center gap-2.5 rounded-[var(--sx-r-xs)] px-3 py-2.5 text-[13px] font-semibold text-[var(--sx-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sx-ink)]"
                      >
                        <FiPackage className="h-4 w-4" style={{ color: '#8fbcff' }} />
                        My purchases
                      </Link>
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-[var(--sx-r-xs)] px-3 py-2.5 text-[13px] font-semibold text-[var(--sx-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sx-ink)]"
                      >
                        <FiLock className="h-4 w-4" style={{ color: '#b6a4ff' }} />
                        Admin panel
                      </Link>
                      <div className="my-1 h-px" style={{ background: 'var(--sx-hair)' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-[var(--sx-r-xs)] px-3 py-2.5 text-left text-[13px] font-semibold text-[#ff9aa6] transition-colors hover:bg-[rgba(251,113,133,0.1)]"
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
                className="sx-focus group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold text-white transition-all"
                style={{ background: '#5865F2', boxShadow: '0 10px 26px -14px rgba(88,101,242,0.9)' }}
              >
                <FaDiscord className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="sx-focus flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white/5 lg:hidden"
              style={{ borderColor: 'var(--sx-hair)' }}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <FiX className="h-4 w-4 text-[var(--sx-ink)]" />
              ) : (
                <FiMenu className="h-4 w-4 text-[var(--sx-ink)]" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile sheet ─────────────────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="sx-panel-solid mt-2.5 overflow-hidden p-2 lg:hidden"
              style={{ borderRadius: 'var(--sx-r-lg)' }}
            >
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block rounded-[var(--sx-r-sm)] px-3.5 py-3 text-[14px] font-semibold text-[var(--sx-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sx-ink)]"
              >
                Home
              </Link>
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-[var(--sx-r-sm)] px-3.5 py-3 text-[14px] font-semibold transition-colors hover:bg-white/[0.06]"
                  style={{ color: link.href === '/shop' ? 'var(--sx-ink)' : 'var(--sx-ink-2)' }}
                >
                  {link.label}
                  {link.href === '/shop' && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C6AF5' }} />
                  )}
                </Link>
              ))}
              {authenticated && (
                <Link
                  href="/purchases"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[var(--sx-r-sm)] px-3.5 py-3 text-[14px] font-semibold text-[var(--sx-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sx-ink)]"
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
