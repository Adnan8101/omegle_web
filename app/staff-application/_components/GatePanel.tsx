'use client';

import type { ReactNode } from 'react';
import { Item, Reveal, RevealGroup } from '@/components/motion';

interface GatePanelProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  accent?: string;
  children?: ReactNode;
}

/**
 * The shared shell for every step that isn't the form itself — TOS, the
 * Discord sign-in gate, "this role is closed," "applications are closed."
 * Same card, same rhythm, so those pauses feel like one continuous flow
 * instead of four differently-designed dead ends.
 */
export default function GatePanel({ icon, eyebrow, title, body, accent = '#3B9EFF', children }: GatePanelProps) {
  return (
    <Reveal dir="up" distance={22} scale={0.98} className="mx-auto w-full max-w-xl">
      <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] px-7 py-11 text-center sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[420px] -translate-x-1/2"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}2e 0%, transparent 70%)` }}
        />
        <RevealGroup mount stagger={0.1} className="relative">
          <Item dir="none" scale={0.85}>
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border"
              style={{ borderColor: `${accent}40`, background: `${accent}14`, color: accent }}
            >
              {icon}
            </div>
          </Item>
          <Item dir="none" scale={0.9}>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: accent }}>
              {eyebrow}
            </span>
          </Item>
          <Item>
            <h2 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em] text-white sm:text-[30px]">{title}</h2>
          </Item>
          <Item blur>
            <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-white/50">{body}</p>
          </Item>
          {children && <Item className="mt-8">{children}</Item>}
        </RevealGroup>
      </div>
    </Reveal>
  );
}
