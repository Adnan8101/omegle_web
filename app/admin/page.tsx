'use client';
import { signIn,signOut,useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import { FiLock, FiAlertTriangle, FiLogOut, FiHome } from 'react-icons/fi';
export default function AdminLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.permissions?.hasAnyAccess) {
      setIsRedirecting(true);
      const perms = session?.user?.permissions;
      if (perms?.hasFullAccess) {
        router.push('/admin/tickets');
      } else if (perms?.hasCasinoAccess) {
        router.push('/admin/shop');
      } else if (perms?.hasSrModAccess) {
        router.push('/admin/vctranscript');
      } else if (perms?.hasModeratorAccess) {
        router.push('/admin/dashboard');
      } else {
        router.push('/admin/vctranscript');
      }
    }
  }, [status, session, router]);
  if (status === 'loading' || isRedirecting) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">
            {isRedirecting ? 'Redirecting to dashboard...' : 'Checking authentication...'}
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6 apple-transition relative overflow-hidden">
      {}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      <div className="w-full max-w-md">
        {}
        <div className="text-center mb-12 animate-fade-in space-y-6">
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omegle Logo"
                fill
                className="object-cover rounded-full drop-shadow-2xl"
                priority
              />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-[rgb(var(--color-text-primary))] mb-3 tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xl text-blue-600 dark:text-blue-400 font-light">
              Omeglee Community Management
            </p>
          </div>
        </div>
        {}
        <div className="glass-blue rounded-3xl p-10 border border-blue-500/20 shadow-blue-glow animate-scale-in">
          <div className="flex items-center justify-center mb-8">
            <div className="p-5 bg-blue-500/10 rounded-full border border-blue-500/30">
              <FiLock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-center mb-8 text-[rgb(var(--color-text-primary))]">
            Discord Authentication
          </h2>
          <div className="space-y-6">
            <p className="text-center text-[rgb(var(--color-text-secondary))]">
              Sign in with your Discord account to access the admin dashboard
            </p>
            {status === 'unauthenticated' && (
              <button
              onClick={() => signIn('discord', { callbackUrl: '/admin' })}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
                </svg>
                Sign in with Discord
              </button>
            )}
            {status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess && (
              <div className="space-y-6">
                {/* Premium Lock/Shield Header */}
                <div className="text-center relative py-4">
                  <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
                    <FiAlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                    <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">Access Denied</h2>
                  <p className="text-sm text-[rgb(var(--color-text-secondary))] font-light mt-2 px-4 max-w-sm mx-auto leading-relaxed">
                    You do not have the required permissions to access this dashboard. Please contact a server administrator if you believe this is an error.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
                      signOut({ callbackUrl: '/admin' });
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg shadow-red-600/10 hover:shadow-red-600/20 font-medium"
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Sign Out & Try Again</span>
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] rounded-2xl transition-all duration-200 border border-[rgb(var(--color-border))] font-medium"
                  >
                    <FiHome className="w-4 h-4" />
                    <span>Go Back to Home</span>
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-center text-[rgb(var(--color-text-tertiary))] mt-6">
              You must have the required role in Omeglee Community server
            </p>
          </div>
        </div>
        {}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-[rgb(var(--color-text-secondary))] hover:text-blue-600 dark:hover:text-blue-400 text-sm inline-flex items-center gap-2 apple-transition font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}