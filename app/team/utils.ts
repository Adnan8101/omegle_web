import type { TeamMember } from './types';

/** "Mar 2024" — team tenure, from the real `created_at` on the roster row. */
export function formatJoined(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function joinedYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

export function initialsOf(member: TeamMember): string {
  const source = member.profile.displayName || member.profile.username || '?';
  return source.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 2).toUpperCase() || '?';
}

/**
 * Discord serves animated assets as .gif but not every CDN variant exists —
 * fall back to the static .webp rather than showing a broken image.
 */
export function swapGifForWebp(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.src.includes('.gif')) image.src = image.src.replace('.gif', '.webp');
}
