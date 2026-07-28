'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { signIn,signOut,useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useMemo,useRef,useState } from 'react';
import { FiChevronDown,FiMenu,FiMoon,FiSun,FiX } from 'react-icons/fi';
import { Reveal } from '@/components/motion';
export default function SiteNavbar() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(!isHome);
  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);
  const links = useMemo(
    () => [
      { label: 'Shop', href: '/shop' },
      { label: 'Team', href: '/team' },
      { label: 'Staff Application', href: '/staff-application' },
    ],
    []
  );
  const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;
  const membershipsHref = sessionGuildId
    ? `/donator/subscriptions?guild_id=${encodeURIComponent(sessionGuildId)}`
    : '/memberships';
  return (
    <header
      className={`${isHome ? 'fixed' : 'sticky'} top-4 sm:top-5 left-0 right-0 z-50 pointer-events-none`}
    >
      <Reveal mount dir="down" distance={18} duration={0.7} className="mx-auto w-[92%] max-w-[900px] pointer-events-auto">
        <div className="h-[52px] sm:h-[58px] px-5 sm:px-6 flex items-center justify-between rounded-full border border-white/10 bg-[#0a0a0f]/85 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <Link href="/" className="nav-brand flex items-center gap-3 translate-y-[1px]">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omeglee"
                fill
                className="object-cover rounded-full"
                unoptimized
              />
            </div>
            <span className="font-[var(--font-display)] text-sm sm:text-base font-semibold tracking-tight text-[rgb(var(--color-text-primary))]">Omeglee</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link text-[14px] font-medium text-white/70 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2" ref={profileRef}>

            {status === 'authenticated' ? (
              <>
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg pl-2 pr-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 apple-transition"
                >
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="profile" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[rgb(var(--color-bg-tertiary))]" />
                  )}
                  <span className="text-sm font-medium text-[rgb(var(--color-text-primary))] max-w-[140px] truncate">
                    {session?.user?.name || 'Profile'}
                  </span>
                  <FiChevronDown className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                </button>
                {profileOpen && (
                  <div className="absolute top-12 right-6 w-64 rounded-xl border border-black/10 dark:border-white/10 bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(33,33,36,0.95)] backdrop-blur-2xl shadow-xl p-2">
                    <Link
                      href={membershipsHref}
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm text-[rgb(var(--color-text-primary))] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Memberships
                    </Link>
                    <Link
                      href="/staff-application"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm text-[rgb(var(--color-text-primary))] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Staff Application
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--color-text-primary))] text-[rgb(var(--color-bg-primary))] text-sm font-semibold"
              >
                Sign in
              </button>
            )}
          </div>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden mt-2 rounded-2xl border border-white/10 bg-[#09090b]/90 backdrop-blur-xl p-4 space-y-1.5 shadow-2xl">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-primary))] hover:bg-black/5 dark:hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={membershipsHref}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-primary))] hover:bg-black/5 dark:hover:bg-white/10"
            >
              Memberships
            </Link>
            <div className="flex items-center justify-between pt-1">

              {status === 'authenticated' ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => signIn('discord')}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-[rgb(var(--color-text-primary))] text-[rgb(var(--color-bg-primary))]"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        )}
      </Reveal>
    </header>
  );
}