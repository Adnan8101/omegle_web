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
  developers: TeamMember[];
  management: TeamMember[];
}

export type DepartmentId = keyof TeamData;

export interface Department {
  id: DepartmentId;
  /** Section index rendered as the oversized ghost numeral. */
  index: string;
  label: string;
  title: string;
  blurb: string;
  accent: string;
  /** Leadership gets a wider, more cinematic card treatment. */
  layout: 'feature' | 'grid';
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'founders',
    index: '01',
    label: 'Founders',
    title: 'Founders & Leadership',
    blurb:
      'The people who started Omeglee and still set its direction — from the shape of the community to the standards everyone else builds against.',
    accent: '#F5A524',
    layout: 'feature',
  },
  {
    id: 'developers',
    index: '02',
    label: 'Developers',
    title: 'Bot Engineering',
    blurb:
      'They build and run the bot, the economy, and the systems this entire site sits on top of. Every payout you see settled server-side is their work.',
    accent: '#22D3EE',
    layout: 'grid',
  },
  {
    id: 'management',
    index: '03',
    label: 'Management',
    title: 'Community Management',
    blurb:
      'Day-to-day operations, moderation, and events. The reason the server stays welcoming at three in the morning.',
    accent: '#C084FC',
    layout: 'grid',
  },
];
