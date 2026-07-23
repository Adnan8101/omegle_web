'use client';

import { DEV_ACCESS_PASSWORD, DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiLock, FiX, FiAlertCircle } from 'react-icons/fi';

const SHOW =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_SHOW_WHEEL_DEV_ACCESS === 'true';

interface DevAccessButtonProps {
  
  target?: string;
  
  label?: string;
  
  description?: string;
}

export default function DevAccessButton({
  target = '/gambling?dev=1',
  label = 'Developer Access',
  description = 'Enter the password to open the gambling lobby.',
}: DevAccessButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!SHOW) return null;

  const submit = async () => {
    if (verifying) return;
    setVerifying(true);
    setError(false);

    
    try {
      const res = await fetch('/api/gambling/dev-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError(true);
        setVerifying(false);
        return;
      }
    } catch {
      setError(true);
      setVerifying(false);
      return;
    }

    
    
    try {
      sessionStorage.setItem(DEV_ACCESS_STORAGE_KEY, password);
    } catch {
      
    }

    
    router.push(target);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setPassword('');
          setError(false);
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
      >
        <FiLock className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="relative glass-blue rounded-3xl border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-2xl p-8 max-w-sm w-full">
            {}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))]"
            >
              <FiX className="w-5 h-5" />
            </button>

            {}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 relative">
                <FiLock className="w-7 h-7 text-purple-400" />
                <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-md -z-10" />
              </div>
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                Developer Access
              </h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1.5 leading-relaxed">
                {description}
              </p>
            </div>

            {}
            <label className="block text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-2 tracking-wide uppercase">
              Enter Password
            </label>

            {}
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••••••••••"
              className={`w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border text-[rgb(var(--color-text-primary))] text-center tracking-[0.25em] font-mono mb-4 outline-none focus:ring-2 focus:ring-purple-500/40 transition-all ${
                error
                  ? 'border-red-500/60 bg-red-500/5'
                  : 'border-[rgb(var(--color-border))] focus:border-purple-500/50'
              }`}
            />

            {}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">Invalid Developer Password</p>
              </div>
            )}

            {}
            <div className="flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={verifying || !password}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  'Verify Access'
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-full px-5 py-2.5 rounded-xl text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-tertiary))] text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
