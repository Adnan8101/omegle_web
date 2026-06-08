'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiHome, FiFileText, FiLogOut, FiGlobe, FiMenu, FiX,
    FiUsers, FiMessageSquare, FiBarChart2, FiMic, FiDollarSign,
    FiSun, FiMoon, FiActivity, FiUserPlus, FiShield, FiCreditCard, FiAlertOctagon
} from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { QrCodeIcon } from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}
QrCodeIcon
export default function AdminLayout({ children }: AdminLayoutProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/admin');
        } else if (status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess) {
            router.replace('/admin');
        } else if (status === 'authenticated' && session?.user?.permissions?.hasAnyAccess) {
            // If user only has casino access, redirect from non-casino pages to casino
            const perms = session?.user?.permissions;
            const hasCasinoOnly = perms?.hasCasinoAccess && !perms?.hasFullAccess && !perms?.hasModeratorAccess && !perms?.hasViewOnlyAccess;
            
            if (hasCasinoOnly && pathname && !pathname.startsWith('/admin/casino') && pathname !== '/admin' && pathname !== '/admin/signin') {
                router.replace('/admin/casino');
            }
        }
    }, [status, session, router, pathname]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
        // Use redirect: true to ensure proper signout flow
        await signOut({ callbackUrl: '/admin', redirect: true });
    };

    // Single smooth loading state
    if (!mounted || status === 'loading') {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    // Don't wrap the signin page with the sidebar
    if (pathname === '/admin' || pathname === '/admin/signin') {
        return <>{children}</>;
    }

    if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess)) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
                <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
                    <div className="text-center space-y-6">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                                Redirecting...
                            </h2>
                            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                                {status === 'unauthenticated' ? 'Taking you to login page.' : 'Access denied. Redirecting you.'}
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
                                await signOut({ redirect: false });
                                window.location.replace('/admin');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/30"
                        >
                            <FiLogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const navItems = [
        {
            name: 'Dashboard',
            href: '/admin/dashboard',
            icon: <FiHome className="w-5 h-5" />,
            requiresFullAccess: true,
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'Live Monitor',
            href: '/admin/monitor',
            icon: <FiActivity className="w-5 h-5" />,
            requiresFullAccess: true,
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'Staff Applications',
            href: '/admin/dashboard/applications',
            icon: <FiFileText className="w-5 h-5" />,
            requiresFullAccess: true,
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'Casino Economy',
            href: '/admin/casino',
            icon: <FiDollarSign className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: false,
            requiresCasinoAccess: true, // Casino role or full access
        },
        {
            name: 'Invite System',
            href: '/admin/casino/economy/invites',
            icon: <FiUserPlus className="w-5 h-5" />,
            requiresFullAccess: true, // Admin only
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'AutoMod',
            href: '/admin/automod',
            icon: <FiShield className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: true,
            requiresCasinoAccess: false,
        },

        {
            name: 'Donator Plans',
            href: '/admin/donator',
            icon: <FiCreditCard className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: true,
            requiresCasinoAccess: false,
        },
        {
            name: 'Donator Subs',
            href: '/admin/donator/subscriptions',
            icon: <FiUsers className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: true,
            requiresCasinoAccess: false,
        },
        {
            name: 'Donator Payments',
            href: '/admin/donator/payments',
            icon: <FiDollarSign className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: true,
            requiresCasinoAccess: false,
        },
        {
            name: 'Mod Stats',
            href: '/admin/mods-stats',
            icon: <FiUsers className="w-5 h-5" />,
            requiresFullAccess: true, // Admin only
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'VC Stats',
            href: '/admin/vctranscript',
            icon: <FiMic className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: false, // Trail Mod can access
            requiresCasinoAccess: false,
        },
        {
            name: 'VC Automation',
            href: '/admin/vc-automation',
            icon: <FiShield className="w-5 h-5" />,
            requiresFullAccess: true,
            requiresModeratorAccess: false,
            requiresCasinoAccess: false,
        },
        {
            name: 'Chat Stats',
            href: '/admin/vctranscript/chatlogs',
            icon: <FiMessageSquare className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: false, // Trail Mod can access
            requiresCasinoAccess: false,
        },
        {
            name: 'Server Stats',
            href: '/admin/server-stats',
            icon: <FiBarChart2 className="w-5 h-5" />,
            requiresFullAccess: false,
            requiresModeratorAccess: true, // Moderator+ only (NOT Trail Mod)
            requiresCasinoAccess: false,
        },
    ].filter(item => {
        // Filter based on permissions
        const perms = session?.user?.permissions;
        
        // Full access sees everything
        if (perms?.hasFullAccess) {
            return true;
        }
        
        // Casino-only users should ONLY see casino section
        const hasCasinoOnly = perms?.hasCasinoAccess && !perms?.hasModeratorAccess && !perms?.hasViewOnlyAccess;
        if (hasCasinoOnly) {
            return item.requiresCasinoAccess;
        }
        
        // Casino access users can see casino items
        if (item.requiresCasinoAccess && perms?.hasCasinoAccess) {
            return true;
        }
        
        // Full access required items
        if (item.requiresFullAccess) {
            return perms?.hasFullAccess;
        }
        
        // Moderator access required items
        if (item.requiresModeratorAccess) {
            return perms?.hasModeratorAccess || perms?.hasFullAccess;
        }
        return perms?.hasModeratorAccess || perms?.hasViewOnlyAccess;
    });

    const isActive = (href: string) => {
        if (href === '/admin/dashboard') {
            return pathname === '/admin/dashboard';
        }
        if (href === '/admin/dashboard/applications') {
            return pathname.startsWith('/admin/dashboard/applications');
        }
        if (href === '/admin/casino') {
            return pathname === '/admin/casino';
        }
        if (href === '/admin/casino/economy/invites') {
            return pathname.startsWith('/admin/casino/economy/invites');
        }
        if (href === '/admin/mods-stats') {
            return pathname.startsWith('/admin/mods-stats');
        }
        if (href === '/admin/donator') {
            return pathname === '/admin/donator';
        }
        if (href === '/admin/donator/subscriptions') {
            return pathname.startsWith('/admin/donator/subscriptions');
        }
        if (href === '/admin/donator/payments') {
            return pathname.startsWith('/admin/donator/payments');
        }
        if (href === '/admin/vctranscript/chatlogs') {
            return pathname.startsWith('/admin/vctranscript/chatlogs');
        }
        if (href === '/admin/vctranscript') {
            return pathname.startsWith('/admin/vctranscript') && !pathname.startsWith('/admin/vctranscript/chatlogs');
        }
        if (href === '/admin/vc-automation') {
            return pathname.startsWith('/admin/vc-automation');
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen w-full overflow-x-clip flex flex-col md:flex-row bg-[rgb(var(--color-bg-primary))] apple-transition">
            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-50 bg-[rgb(var(--color-bg-secondary))]/80 backdrop-blur-xl border-b border-[rgb(var(--color-border))] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                        <Image
                            src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                            alt="Omegle Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-lg font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                        Admin Panel
                    </h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition touch-manipulation"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? (
                        <FiX className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
                    ) : (
                        <FiMenu className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
                    )}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
        fixed md:static inset-0 z-40 md:z-auto
        w-full md:w-72 
        bg-[rgb(var(--color-bg-secondary))]/95 backdrop-blur-xl md:bg-[rgb(var(--color-bg-secondary))]
        border-r border-[rgb(var(--color-border))] 
        flex flex-col 
        shadow-apple-lg
        transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
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
                            className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition"
                        >
                            <FiX className="w-6 h-6 text-[rgb(var(--color-text-primary))]" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 md:p-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-2xl apple-transition touch-manipulation ${isActive(item.href)
                                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-blue-glow'
                                : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] hover:text-[rgb(var(--color-text-primary))]'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                {/* User Info & Bottom Actions */}
                <div className="p-4 md:p-6 border-t border-[rgb(var(--color-border))] space-y-2">
                    {session?.user?.name && (
                        <div className="px-4 py-3 mb-2 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Signed in as</p>
                                <p className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{session.user.name}</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-bg-primary))] apple-transition"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? (
                                    <FiSun className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <FiMoon className="w-5 h-5 text-blue-500" />
                                )}
                            </button>
                        </div>
                    )}
                    <Link
                        href="/"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] hover:text-[rgb(var(--color-text-primary))] apple-transition touch-manipulation"
                    >
                        <FiGlobe className="w-5 h-5" />
                        <span className="font-medium">Public Site</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-500/10 apple-transition touch-manipulation"
                    >
                        <FiLogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto bg-[rgb(var(--color-bg-primary))]">
                {children}
            </main>
        </div>
    );
}
