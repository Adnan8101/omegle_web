'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MembershipsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (sessionGuildId) {
      router.replace(`/donator/subscriptions?guild_id=${encodeURIComponent(sessionGuildId)}`);
    }
  }, [status, sessionGuildId, router]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center pt-16">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto" />
          <p className="text-[rgb(var(--color-text-secondary))]">Loading memberships...</p>
        </div>
      </main>
    );
  }

  if (status !== 'authenticated') {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6 pt-16">
        <div className="max-w-xl w-full rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">Memberships</h1>
          <p className="mt-3 text-[rgb(var(--color-text-secondary))]">Sign in with Discord to view your active memberships and subscription history.</p>
          <button
            onClick={() => signIn('discord')}
            className="mt-6 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Sign in with Discord
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6 pt-16">
      <div className="max-w-2xl w-full rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-8 sm:p-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">Memberships</h1>
        <p className="mt-4 text-[rgb(var(--color-text-secondary))] text-lg">We could not detect a default server from your session.</p>
        <p className="mt-2 text-[rgb(var(--color-text-tertiary))]">Pick a plan server first, then open your subscriptions.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/donator"
            className="px-5 py-3 rounded-xl bg-[rgb(var(--color-text-primary))] text-[rgb(var(--color-bg-primary))] font-semibold"
          >
            Choose Server and Plan
          </Link>
          <Link
            href="/donator/subscriptions"
            className="px-5 py-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))] font-semibold"
          >
            Open Subscriptions
          </Link>
        </div>
      </div>
    </main>
  );
}
