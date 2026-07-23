'use client';
// Developer Access entry point (spec §6). Dev-only button on the homepage's
// "Omeglee Gambling" card: password popup → on success, store the dev token and
// open the real Spin the Wheel page (bypassing the enable-gate server-side).
//
// Rendered only in development builds (or when NEXT_PUBLIC_SHOW_WHEEL_DEV_ACCESS
// is set), so it is trivially removed for launch.

import { DEV_ACCESS_PASSWORD, DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiLock, FiX } from 'react-icons/fi';

const SHOW =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_SHOW_WHEEL_DEV_ACCESS === 'true';

export default function DevAccessButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!SHOW) return null;

  const submit = () => {
    if (password === DEV_ACCESS_PASSWORD) {
      try {
        sessionStorage.setItem(DEV_ACCESS_STORAGE_KEY, password);
      } catch {
        /* ignore */
      }
      router.push('/wheel?dev=1');
    } else {
      setError(true);
    }
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
        Developer Access
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="relative glass-blue rounded-3xl border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-2xl p-8 max-w-sm w-full">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))]"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                <FiLock className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Developer Access</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                Enter the password to open the Spin the Wheel test page.
              </p>
            </div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Password"
              className={`w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border text-[rgb(var(--color-text-primary))] text-center mb-3 ${
                error ? 'border-red-500/60' : 'border-[rgb(var(--color-border))]'
              }`}
            />
            {error && <p className="text-xs text-red-400 text-center mb-3">Incorrect password.</p>}
            <button
              onClick={submit}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold transition-all"
            >
              Unlock
            </button>
          </div>
        </div>
      )}
    </>
  );
}
