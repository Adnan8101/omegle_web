export interface DiscordProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  accentColor: string | null;
}

export interface TeamMember {
  id: string;
  discord_user_id: string;
  designation: string;
  created_at: string;
  profile: DiscordProfile;
}

export interface TeamData {
  founders: TeamMember[];
  admins: TeamMember[];
  core_team: TeamMember[];
}

export type DepartmentId = keyof TeamData;

/** How a rank is drawn: a wide feature slab, a portrait card, or a compact row. */
export type CardVariant = 'feature' | 'standard' | 'compact';

export interface Department {
  id: DepartmentId;
  /** Tab label for this rank. */
  label: string;
  /** Badge text when the DB row has no designation of its own — singular. */
  role: string;
  variant: CardVariant;
  /** Solid rank colour — badge text, hairline, numerals. */
  ink: string;
  /** Border/avatar-ring colour. */
  ring: string;
  /** Ambient wash behind the card. */
  glow: string;
  /** Grid density for this rank — leadership breathes, the roster packs. */
  grid: string;
}

/**
 * Rank order, chrome, and card shape — the page's whole hierarchy in one
 * table. Same `ink`/`ring`/`glow` split the leaderboard tiers use, so gold
 * here reads as the same gold there.
 */
export const DEPARTMENTS: Department[] = [
  {
    id: 'founders',
    label: 'Founder',
    role: 'Founder',
    variant: 'feature',
    ink: '#FBBF24',
    ring: 'rgba(251,191,36,0.55)',
    glow: 'rgba(245,158,11,0.20)',
    grid: 'grid-cols-1 gap-5 md:grid-cols-2',
  },
  {
    id: 'admins',
    label: 'Admins',
    role: 'Admin',
    variant: 'standard',
    ink: '#22D3EE',
    ring: 'rgba(34,211,238,0.48)',
    glow: 'rgba(34,211,238,0.16)',
    grid: 'grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
  },
  {
    id: 'core_team',
    label: 'Core Team',
    role: 'Core Team',
    variant: 'compact',
    ink: '#A78BFA',
    ring: 'rgba(167,139,250,0.42)',
    glow: 'rgba(167,139,250,0.15)',
    grid: 'grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3',
  },
];

export const DEPARTMENT_BY_ID = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department])
) as Record<DepartmentId, Department>;
