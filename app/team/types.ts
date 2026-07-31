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
  label: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'founders', label: 'Founders' },
  { id: 'developers', label: 'Developers' },
  { id: 'management', label: 'Management' },
];
