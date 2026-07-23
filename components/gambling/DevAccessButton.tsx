'use client';

import { DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiLock, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const submit = async () => {
    if (verifying || !password) return;
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
      /* ignore */
    }

    setVerifying(false);
    setOpen(false);
    router.push(target);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className="relative bg-slate-900 border border-purple-500/40 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.3)] p-8 max-w-sm w-full text-white">
        {/* Close Button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto mb-4 relative shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <FiLock className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            Developer Access
          </h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-2">
              Enter Password
            </label>
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
              className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-center tracking-[0.25em] font-mono outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                error
                  ? 'border-red-500 bg-red-950/20'
                  : 'border-slate-700 focus:border-purple-500'
              }`}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 animate-shake">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs font-semibold">Invalid Developer Password</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={submit}
              disabled={verifying || !password}
              className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {verifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying Access…
                </span>
              ) : (
                'Verify Access'
              )}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="w-full px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setPassword('');
          setError(false);
        }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 border border-purple-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <FiLock className="w-4 h-4 text-purple-200" />
        {label}
      </button>

      {open && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
