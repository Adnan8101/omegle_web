export type StaffRole =
  | 'moderation'
  | 'event_team'
  | 'gaming_mod'
  | 'media_team'
  | 'entertainment_team';

export interface StaffQuestion {
  id: string;
  title: string;
  prompt: string;
  placeholder: string;
}

export interface StaffRoleMeta {
  id: StaffRole;
  label: string;
  shortDescription: string;
}

export const STAFF_ROLES: StaffRoleMeta[] = [
  {
    id: 'moderation',
    label: 'Moderation',
    shortDescription: 'Rule enforcement, safety, and fair moderation decisions.',
  },
  {
    id: 'event_team',
    label: 'Event Team',
    shortDescription: 'Plan, host, and improve structured community events.',
  },
  {
    id: 'gaming_mod',
    label: 'Gaming Mod',
    shortDescription: 'Revive and manage active, inclusive gaming voice channels.',
  },
  {
    id: 'media_team',
    label: 'Media Team',
    shortDescription: 'Capture, edit, and publish content that grows engagement.',
  },
  {
    id: 'entertainment_team',
    label: 'Entertainment Team',
    shortDescription: 'Host music/jamming activities and keep daily VC energy high.',
  },
];

export const COMMON_QUESTIONS: StaffQuestion[] = [
  {
    id: 'introduction_purpose',
    title: 'Introduction & Purpose',
    prompt:
      'Why do you want to join the team, and why are you applying for this role? Explain what value you bring and why you are suitable.',
    placeholder:
      'Describe your motivation, strengths, and how you will contribute to this role in the community.',
  },
  {
    id: 'daily_availability',
    title: 'Availability & Commitment',
    prompt:
      'How much time can you dedicate to the server on a daily basis? Mention active hours and consistency.',
    placeholder:
      'Example: 2-3 hours daily, mostly 7 PM to 10 PM IST, available 6 days a week.',
  },
];

export const ROLE_QUESTIONS: Record<StaffRole, StaffQuestion[]> = {
  moderation: [
    {
      id: 'moderation_experience',
      title: 'Moderation Experience',
      prompt: 'Do you have previous moderation experience? Describe your roles and responsibilities.',
      placeholder: 'Communities you moderated, actions handled, and moderation style.',
    },
    {
      id: 'moderator_definition',
      title: 'Good Moderator Definition',
      prompt: 'What does being a good moderator mean to you?',
      placeholder: 'How you balance fairness, communication, and rule enforcement.',
    },
    {
      id: 'leadership_experience',
      title: 'Leadership Experience',
      prompt: 'Do you have leadership experience? Explain with examples.',
      placeholder: 'How you handled team coordination, conflict, and responsibility.',
    },
    {
      id: 'discord_bot_experience',
      title: 'Discord Bot Experience',
      prompt: 'What is your experience with Discord bots? Mention practical usage level.',
      placeholder: 'Bots used, setup experience, command usage, and confidence level.',
    },
    {
      id: 'automod_knowledge',
      title: 'AutoMod Knowledge',
      prompt: 'How much do you know about AutoMod and automated moderation workflows?',
      placeholder: 'Filters, anti-spam setup, keyword rules, and escalation flow.',
    },
    {
      id: 'moderation_bots_familiarity',
      title: 'Moderation Bots Familiarity',
      prompt: 'Which moderation bots are you familiar with?',
      placeholder: 'Examples: Dyno, Carl-bot, Wick, YAGPDB, etc.',
    },
    {
      id: 'mod_commands_knowledge',
      title: 'Moderation Commands Knowledge',
      prompt: 'What moderation commands/actions are you comfortable handling?',
      placeholder: 'Warn, timeout, mute, kick, ban, evidence logging, appeal handling.',
    },
  ],
  gaming_mod: [
    {
      id: 'vc_activity_revival',
      title: 'VC Activity Revival',
      prompt:
        'Gaming voice channels are inactive. What exact steps will you take within the same day to revive and sustain activity?',
      placeholder: 'Immediate actions, engagement strategy, and retention approach.',
    },
    {
      id: 'live_vc_engagement',
      title: 'Live VC Engagement',
      prompt:
        'You join a VC where members are present but quiet. How will you make it lively without forcing participation?',
      placeholder: 'Conversation starters, games, social cues, and pacing.',
    },
    {
      id: 'player_management',
      title: 'Player Management',
      prompt:
        'In a game session, some players dominate and others feel left out. How will you ensure balanced participation?',
      placeholder: 'Fairness methods, rotation, communication, and moderation style.',
    },
    {
      id: 'quick_execution',
      title: 'Quick Execution',
      prompt:
        'You need to organize a game session immediately with members in VC. How do you set up teams, rules, and start smoothly?',
      placeholder: 'Fast setup flow, role assignment, and clarity tactics.',
    },
    {
      id: 'retention_after_activity',
      title: 'Retention After Activity',
      prompt:
        'Members leave right after events. How will you keep people in VC longer and build consistent activity?',
      placeholder: 'Post-event hooks, recurring touchpoints, and community habits.',
    },
  ],
  event_team: [
    {
      id: 'full_event_planning',
      title: 'Full Event Planning',
      prompt:
        'Explain how you would plan and execute a gaming event from start to finish (idea, announcement, operations, and results).',
      placeholder: 'End-to-end plan with ownership and timeline.',
    },
    {
      id: 'low_participation',
      title: 'Low Participation Handling',
      prompt:
        'You organized an event but turnout is low. How do you recover live and improve future participation?',
      placeholder: 'Immediate adaptation and long-term strategy.',
    },
    {
      id: 'unexpected_issues',
      title: 'Unexpected Issues',
      prompt:
        'During an event, technical confusion occurs. How do you handle it without losing control or causing major delays?',
      placeholder: 'Crisis response, communication, and fallback plans.',
    },
    {
      id: 'scheduling_strategy',
      title: 'Scheduling Strategy',
      prompt:
        'Members are active at different times. How would you choose event timings to maximize participation?',
      placeholder: 'Data points, polling, and schedule balancing.',
    },
    {
      id: 'post_event_evaluation',
      title: 'Post-Event Evaluation',
      prompt:
        'You receive mixed/negative feedback after an event. How do you analyze and improve upcoming events?',
      placeholder: 'Feedback loop, metrics, and implementation plan.',
    },
  ],
  media_team: [
    {
      id: 'content_identification',
      title: 'Content Identification',
      prompt: 'How do you identify moments in VC that are worth recording and publishing?',
      placeholder: 'Signal quality, hooks, and replay value criteria.',
    },
    {
      id: 'editing_presentation',
      title: 'Editing & Presentation',
      prompt:
        'You captured a raw clip that is weak. What edits will you apply to make it engaging for social media?',
      placeholder: 'Cuts, captions, pacing, hooks, sound, and formatting.',
    },
    {
      id: 'platform_strategy',
      title: 'Platform Strategy',
      prompt:
        'How do you adapt one clip for Instagram Reels, YouTube Shorts, and similar platforms?',
      placeholder: 'Format, audience behavior, metadata, and distribution strategy.',
    },
    {
      id: 'consistency_strategy',
      title: 'Consistency Under Low Activity',
      prompt:
        'VC activity is low for a few days. How do you maintain posting consistency without compromising quality?',
      placeholder: 'Backlog systems, repurposing, and editorial planning.',
    },
    {
      id: 'growth_engagement',
      title: 'Growth & Engagement',
      prompt: 'Your posts have low views. What steps will you take to improve reach and server promotion?',
      placeholder: 'Content improvements, distribution tactics, and iteration loop.',
    },
  ],
  entertainment_team: [
    {
      id: 'daily_jamming_activity',
      title: 'Daily VC Jamming Activity',
      prompt:
        'Voice channels are quiet. How will you start casual music/jamming sessions naturally and keep people in VC?',
      placeholder: 'Natural kickoff strategy and engagement flow.',
    },
    {
      id: 'hosting_music_sessions',
      title: 'Hosting Music Sessions',
      prompt:
        'How would you structure song flow, turn-taking, interaction, and basic rules for a smooth session?',
      placeholder: 'Balanced structure and relaxed vibe execution.',
    },
    {
      id: 'keeping_energy_consistent',
      title: 'Keeping Energy Consistent',
      prompt:
        'During live sessions, engagement drops. What immediate actions will you take to recover energy?',
      placeholder: 'Real-time facilitation and participation tactics.',
    },
    {
      id: 'inclusive_environment',
      title: 'Inclusive Environment',
      prompt:
        'Members have different music tastes and some are shy. How do you keep sessions inclusive and welcoming?',
      placeholder: 'Inclusion methods without pressure.',
    },
    {
      id: 'external_artist_management',
      title: 'External Artist / Host Management',
      prompt:
        'How would you find, evaluate, approach, negotiate, and coordinate external artists/hosts for events?',
      placeholder: 'Selection criteria, budget discussion, and execution steps.',
    },
    {
      id: 'long_term_engagement_strategy',
      title: 'Long-Term Engagement Strategy',
      prompt:
        'How will you design a sustainable mix of daily jamming, themed nights, and special events over time?',
      placeholder: 'Sustainable framework, cadence, and variety plan.',
    },
  ],
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = STAFF_ROLES.reduce(
  (acc, role) => {
    acc[role.id] = role.label;
    return acc;
  },
  {} as Record<StaffRole, string>
);

export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return 'Unknown Role';
  return STAFF_ROLE_LABELS[role as StaffRole] || role;
}

export function getQuestionTitle(role: string | undefined | null, key: string): string {
  const roleKey = role as StaffRole | undefined;
  const roleQuestions = roleKey ? ROLE_QUESTIONS[roleKey] : undefined;
  const commonMatch = COMMON_QUESTIONS.find((question) => question.id === key);
  if (commonMatch) return commonMatch.title;
  const roleMatch = roleQuestions?.find((question) => question.id === key);
  return roleMatch?.title || key;
}
