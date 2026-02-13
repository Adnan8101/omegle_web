'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiLock, FiArrowLeft } from 'react-icons/fi';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password === '123Byte123') {
      sessionStorage.setItem('adminAuth', 'true');
      router.push('/admin/dashboard');
    } else {
      setError('Incorrect password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6 apple-transition relative overflow-hidden">
      {/* Animated Blue Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-12 animate-fade-in space-y-6">
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Omegle Logo"
                fill
                className="object-contain drop-shadow-2xl"
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

        {/* Login Card */}
        <div className="glass-blue rounded-3xl p-10 border border-blue-500/20 shadow-blue-glow animate-scale-in">
          <div className="flex items-center justify-center mb-8">
            <div className="p-5 bg-blue-500/10 rounded-full border border-blue-500/30">
              <FiLock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-8 text-[rgb(var(--color-text-primary))]">
            Authentication Required
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-[rgb(var(--color-text-secondary))]">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                placeholder="Enter admin password"
                autoFocus
                required
              />
              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 font-semibold px-6 py-4 rounded-2xl apple-transition shadow-apple-lg hover:shadow-blue-glow disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Authenticating...
                </span>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[rgb(var(--color-border))]">
            <p className="text-center text-sm text-[rgb(var(--color-text-tertiary))] font-light">
              Authorized personnel only
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-[rgb(var(--color-text-secondary))] hover:text-blue-600 dark:hover:text-blue-400 text-sm inline-flex items-center gap-2 apple-transition font-medium"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
