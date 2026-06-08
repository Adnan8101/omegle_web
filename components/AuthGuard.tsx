'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { UserPermissions } from '@/lib/permissions';

interface AuthGuardProps {
  children: ReactNode;
  requireFullAccess?: boolean;
  requireModeratorAccess?: boolean;
  requireViewAccess?: boolean;
  requireCasinoAccess?: boolean;
  fallbackUrl?: string;
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-[rgb(var(--color-text-secondary))]">Loading...</p>
    </div>
  </div>
);

const AccessDenied = ({ onGoBack }: { onGoBack: () => void }) => (
  <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
    <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
      <div className="text-center space-y-6">
        <div className="text-red-500 text-5xl">❌</div>
        <div>
          <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">
            You do not have permission to access this section.
          </p>
        </div>
        <button
          onClick={onGoBack}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export function AuthGuard({
  children,
  requireFullAccess = false,
  requireModeratorAccess = false,
  requireViewAccess = false,
  requireCasinoAccess = false,
  fallbackUrl = '/admin'
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(fallbackUrl);
      return;
    }
    
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      let hasAccess = false;

      
      if (requireFullAccess) {
        hasAccess = perms?.hasFullAccess ?? false;
      } else if (requireModeratorAccess) {
        hasAccess = perms?.hasFullAccess || perms?.hasModeratorAccess ?? false;
      } else if (requireViewAccess) {
        hasAccess = perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess ?? false;
      } else if (requireCasinoAccess) {
        hasAccess = perms?.hasFullAccess || perms?.hasCasinoAccess ?? false;
      } else {
        
        hasAccess = perms?.hasAnyAccess ?? false;
      }

      if (!hasAccess) {
        router.replace(fallbackUrl);
        return;
      }
    }
  }, [status, session, router, requireFullAccess, requireModeratorAccess, requireViewAccess, requireCasinoAccess, fallbackUrl]);

  
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  
  if (status === 'authenticated') {
    const perms = session?.user?.permissions;
    let hasAccess = false;

    if (requireFullAccess) {
      hasAccess = perms?.hasFullAccess ?? false;
    } else if (requireModeratorAccess) {
      hasAccess = perms?.hasFullAccess || perms?.hasModeratorAccess ?? false;
    } else if (requireViewAccess) {
      hasAccess = perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess ?? false;
    } else if (requireCasinoAccess) {
      hasAccess = perms?.hasFullAccess || perms?.hasCasinoAccess ?? false;
    } else {
      hasAccess = perms?.hasAnyAccess ?? false;
    }

    if (!hasAccess) {
      return <AccessDenied onGoBack={() => router.replace(fallbackUrl)} />;
    }
  }

  return <>{children}</>;
}