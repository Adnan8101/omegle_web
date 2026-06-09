'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
interface CasinoLayoutProps {
  children: React.ReactNode;
}
export default function CasinoLayout({ children }: CasinoLayoutProps) {
  const { status } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
      return;
    }
    if (status === 'authenticated') {
      checkAccess();
    }
  }, [status]);
  const checkAccess = async () => {
    try {
      const res = await fetch('/api/casino/access');
      const data = await res.json();
      if (data.hasAccess) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking casino access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Checking access...</p>
        </div>
      </div>
    );
  }
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-blue rounded-2xl p-8 border border-red-500/30 max-w-md text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
            Access Denied
          </h2>
          <p className="text-[rgb(var(--color-text-secondary))] mb-6">
            You don&apos;t have permission to access the Casino Economy Dashboard.
            You need to be a Server Admin or have the Casino Admin role.
          </p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}