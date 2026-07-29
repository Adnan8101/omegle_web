'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiArrowUpRight, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { Item, Magnetic, Reveal, RevealGroup, ScrollParallax } from '@/components/motion';
import DepartmentRail from './_components/DepartmentRail';
import DepartmentSection from './_components/DepartmentSection';
import MemberSpotlight from './_components/MemberSpotlight';
import TeamHero from './_components/TeamHero';
import TeamSkeleton from './_components/TeamSkeleton';
import { DEPARTMENTS, type TeamData, type TeamMember } from './types';
import { joinedYear } from './utils';

type LoadState = 'loading' | 'ready' | 'error';

export default function TeamPage() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [spotlight, setSpotlight] = useState<TeamMember | null>(null);

  const loadTeam = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/team', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error('Request failed');
      setTeam(payload.data);
      setState('ready');
    } catch (error) {
      console.error('Error fetching team data:', error);
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // One pass produces both the rail's counts and each section's roster, so no
  // component has to reach back into `team` and assert it's loaded.
  const populated = useMemo(
    () =>
      DEPARTMENTS.map((dept) => {
        const members = team?.[dept.id] ?? [];
        return { ...dept, members, count: members.length };
      }).filter((dept) => dept.count > 0),
    [team]
  );

  const { headcount, since } = useMemo(() => {
    const everyone = team ? [...team.founders, ...team.developers, ...team.management] : [];
    const years = everyone.map((m) => joinedYear(m.created_at)).filter((y): y is number => y !== null);
    return {
      headcount: everyone.length,
      since: years.length ? Math.min(...years) : null,
    };
  }, [team]);

  const closeSpotlight = useCallback(() => setSpotlight(null), []);

  return (
    <main className="relative min-h-screen bg-[rgb(var(--color-bg-primary))]">
      <TeamHero headcount={headcount} departments={populated.length} since={since} />

      {/* Ambient wash behind the roster */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[70vh] h-[900px] overflow-hidden">
        <ScrollParallax distance={70} className="absolute -left-[8%] top-0">
          <div
            className="h-[560px] w-[560px]"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(34,211,238,0.10) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
        </ScrollParallax>
        <ScrollParallax distance={55} className="absolute -right-[6%] top-[38%]">
          <div
            className="h-[520px] w-[520px]"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(192,132,252,0.11) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
        </ScrollParallax>
      </div>

      {state === 'ready' && populated.length > 0 && <DepartmentRail departments={populated} />}

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-28 sm:px-8">
        {state === 'loading' && <TeamSkeleton />}

        {state === 'error' && (
          <StatusPanel
            icon={<FiAlertCircle className="h-7 w-7 text-red-400" />}
            tone="rgba(248,113,113,0.14)"
            title="Couldn't load the roster"
            body="The team directory didn't respond. This is usually momentary — give it another try."
            action={
              <button
                type="button"
                onClick={loadTeam}
                className="fx-focus mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
              >
                <FiRefreshCw className="h-4 w-4" />
                Try again
              </button>
            }
          />
        )}

        {state === 'ready' && populated.length === 0 && (
          <StatusPanel
            icon={<FiUsers className="h-7 w-7 text-blue-400" />}
            tone="rgba(59,158,255,0.14)"
            title="No one listed yet"
            body="The roster is being put together. Check back shortly to meet the people running Omeglee."
          />
        )}

        {state === 'ready' && populated.length > 0 && (
          <div className="space-y-24 sm:space-y-32">
            {populated.map((department) => (
              <DepartmentSection
                key={department.id}
                department={department}
                members={department.members}
                onOpenMember={setSpotlight}
              />
            ))}
          </div>
        )}

        {state === 'ready' && <JoinCallout />}
      </div>

      <MemberSpotlight member={spotlight} onClose={closeSpotlight} />
    </main>
  );
}

function StatusPanel({
  icon,
  tone,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Reveal dir="up" scale={0.97} className="mx-auto max-w-xl">
      <div className="fx-surface rounded-[var(--fx-r-xl)] px-8 py-16 text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: tone }}
        >
          {icon}
        </div>
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
          {title}
        </h2>
        <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
          {body}
        </p>
        {action}
      </div>
    </Reveal>
  );
}

function JoinCallout() {
  return (
    <Reveal dir="up" distance={26} scale={0.98} className="mt-28">
      <div className="fx-surface relative overflow-hidden rounded-[var(--fx-r-xl)] px-7 py-12 text-center sm:px-14 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[620px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.22) 0%, rgba(59,158,255,0.08) 45%, transparent 72%)',
            filter: 'blur(48px)',
          }}
        />
        <RevealGroup stagger={0.1} className="relative">
          <Item>
            <span className="fx-eyebrow">Open positions</span>
          </Item>
          <Item>
            <h2 className="mx-auto mt-4 max-w-[20ch] text-[clamp(26px,4.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[rgb(var(--color-text-primary))]">
              There&apos;s room on this wall for you
            </h2>
          </Item>
          <Item blur>
            <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
              We take on moderators and developers throughout the year. If you know the server and
              want to help run it, we&apos;d like to read your application.
            </p>
          </Item>
          <Item scale={0.93}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Magnetic strength={0.26} max={11}>
                <Link
                  href="/staff-application"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14.5px] font-bold text-black shadow-lg shadow-black/25 transition-colors hover:bg-slate-100"
                >
                  Start an application
                  <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              <Magnetic strength={0.2} max={8}>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-[var(--fx-hairline-strong)] px-7 py-3.5 text-[14.5px] font-semibold text-[rgb(var(--color-text-primary))] transition-colors hover:border-[rgb(var(--color-text-primary))]/40"
                >
                  Ask in Discord
                </a>
              </Magnetic>
            </div>
          </Item>
        </RevealGroup>
      </div>
    </Reveal>
  );
}
