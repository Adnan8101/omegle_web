'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { FiAlertTriangle,FiArrowLeft,FiRefreshCw } from 'react-icons/fi';
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: 'Configuration Error',
          description: 'There is a problem with the server configuration. Please contact the administrator.',
          suggestion: 'Make sure NEXTAUTH_URL matches your running app URL (e.g. http://localhost:3000 for local or your production domain in prod).'
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have the required permissions to access this area.',
          suggestion: 'You need the required role in Omeglee Community server to access the admin panel.'
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          description: 'The verification token has expired or has already been used.',
          suggestion: 'Please try signing in again.'
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'OAuthAccountNotLinked':
        return {
          title: 'OAuth Error',
          description: 'There was a problem with Discord authentication.',
          suggestion: 'Please try signing in again. If the problem persists, clear your browser cookies.'
        };
      case 'Callback':
        return {
          title: 'Callback Error',
          description: 'Invalid callback URL or authentication error.',
          suggestion: 'The Discord callback URL may be misconfigured. Contact the administrator.'
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          suggestion: 'Please try again or contact support if the problem persists.'
        };
    }
  };
  const errorInfo = getErrorMessage(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))] p-4">
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-[rgb(var(--color-bg-secondary))] rounded-2xl sm:rounded-3xl shadow-apple-lg border border-[rgb(var(--color-border))]">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
              <FiAlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
            {errorInfo.title}
          </h2>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] mb-4">
            {errorInfo.description}
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
              💡 {errorInfo.suggestion}
            </p>
          </div>
          {error && error !== 'undefined' && (
            <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-lg p-3 mb-6">
              <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">
                Error code: {error}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Link
            href="/admin"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all duration-200"
          >
            <FiRefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-semibold rounded-xl transition-colors border border-[rgb(var(--color-border))]"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        <p className="text-xs text-center text-[rgb(var(--color-text-tertiary))]">
          If you continue to experience issues, please contact support on Discord.
        </p>
      </div>
    </div>
  );
}
export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))]">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}