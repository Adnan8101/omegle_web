export interface TrainingRule {
  id: string;
  title: string;
  keywords: string[];
  body: string;
}

export interface TrainingSection {
  id: string;
  order: number;
  title: string;
  keywords: string[];
  rules: TrainingRule[];
}

export const TRAINING_SECTIONS: TrainingSection[] = [
  {
    id: 'mute-policy',
    order: 1,
    title: '1. Mute Policy for Spamming / Copy-Paste / Troll Mod Pings',
    keywords: ['mute', 'spam', 'copy paste', 'troll mod ping', 'ping'],
    rules: [
      {
        id: '1.1',
        title: 'Spam – First Offense',
        keywords: ['spam first offense', 'verbal warning', 'no manuals', 'repeat spammer'],
        body:
          '**Action:** Give a verbal warning in chat (No Manuals).\n' +
          '- Unless already a repeat spammer at 4th/5th offense — not for copy paste and long para.\n' +
          '- If the user stops, no further action is needed.',
      },
      {
        id: '1.2',
        title: 'Spam – Continued After Verbal',
        keywords: ['spam continued', 'modlogs', '30 minutes mute', 'repeat spammer'],
        body:
          '**Action:** Check modlogs.\n' +
          '- If the user was NOT muted for spam in the last 2 days: mute for 30 minutes.\n' +
          '- If the user was already muted for spam in the last 2 days: increase the timeout with reference to the last given timeout.',
      },
      {
        id: '1.3',
        title: 'Spam – Escalation (Within the Same 2 Days)',
        keywords: ['spam escalation', 'mute duration', 'max cap', '6 hours'],
        body:
          '**Action:** Increase mute duration as follows:\n' +
          '- 30 minutes\n' +
          '- 1 hour\n' +
          '- 2 hours\n' +
          '- 3 hours\n' +
          '- 6 hours (MAX cap)',
      },
      {
        id: '1.4',
        title: 'Spam – Reset Condition',
        keywords: ['reset condition', '2 days', 'counter resets'],
        body:
          'If 2 days pass without further offense, the counter resets.\n' +
          'Start again from verbal warning + 30min mute.',
      },
      {
        id: '1.5',
        title: 'Copy-Paste / Long Para Spam',
        keywords: ['copy paste spam', 'long para spam', 'direct mute', 'no verbal'],
        body:
          '**First Offense:** 30 minutes mute (Direct mute — no verbal, no manual).\n' +
          'Then follow the same escalation as spam:\n' +
          '- 1 hour\n' +
          '- 2 hours\n' +
          '- 3 hours\n' +
          '- 6 hours',
      },
      {
        id: '1.6',
        title: 'Troll Mod Ping',
        keywords: ['troll mod ping', 'manuals', 'revoke punishment', '14 days', 'special case', 'direct mute'],
        body:
          '**Initial Stage:** Starts at 2 manuals (No direct mute).\n' +
          '- 1st Offense: Give 2 manuals (No mute).\n\n' +
          '**Further Offenses:** Increase mute duration based on last mute reference:\n' +
          '- 1 hour (after 2 manuals)\n' +
          '- 2 hours\n' +
          '- 3 hours\n' +
          '- 6 hours (MAX cap)\n\n' +
          '**Revoke Punishment:** After 14 days, restart with 2 manuals.\n\n' +
          '**Special Case:** If someone is vigorously spamming troll mod pings, a direct mute may be issued.',
      },
    ],
  },
  {
    id: 'promotion',
    order: 2,
    title: '2. Promotion / Server Promo / Poaching',
    keywords: ['promotion', 'server promo', 'poaching', 'advertising'],
    rules: [
      {
        id: '2.1',
        title: 'Poaching in VC',
        keywords: ['poaching', 'vc poaching', 'promoting server in vc', 'verbal warn manual'],
        body:
          'If someone is poaching/promoting their server in VC among people to join:\n' +
          '- **First Offence:** Verbal Warn + Manual.\n' +
          '- **Repetition:** Direct BAN or Warn (according to situation).',
      },
      {
        id: '2.2',
        title: 'Self Promotion (YouTube / Instagram / Any Platform)',
        keywords: ['self promotion', 'youtube', 'instagram', 'advertisement', 'alt account', 'newly created account'],
        body:
          'Self promotion includes promoting personal content, social media, channels, links, or any form of advertisement without permission.\n\n' +
          '**Action Flow:**\n' +
          '- First Time: Issue a VERBAL WARN and ask the user to stop.\n' +
          '- Repetition: Issue a WARN.\n' +
          '- Continued Behaviour: After WARN, direct BAN.\n\n' +
          '**Special Case:** If an alt account or newly created account is found whose sole intent is self promotion or server promotion, BAN the account directly without any warning.',
      },
    ],
  },
  {
    id: 'nsfw',
    order: 3,
    title: '3. NSFW Streaming / Images / Stickers or Emojis',
    keywords: ['nsfw', 'streaming', 'stickers', 'emojis', 'images'],
    rules: [
      {
        id: '3.1',
        title: 'NSFW Streaming in Public VC',
        keywords: ['nsfw streaming', 'public vc', 'immediate ban', 'unintentional', 'leniency'],
        body:
          '**Action:** Issue immediate Ban.\n' +
          '**Leniency Clause:** If it’s not intentional, then give a Warn.',
      },
      {
        id: '3.2',
        title: 'Sending NSFW Stickers / Emojis',
        keywords: ['nsfw stickers', 'nsfw emojis', 'verbal warn', 'extreme case'],
        body:
          '**1st Offense:** Give Verbal Warn (if Extreme Case, issue direct Warn).',
      },
      {
        id: '3.3',
        title: 'NSFW Sticker / Emoji – Further Action Flow',
        keywords: ['further action', 'repetition warn', 'troll account nsfw', 'direct ban'],
        body:
          '- First Time: Issue a VERBAL WARN and ask the user to stop.\n' +
          '- Repetition: Issue a WARN.\n' +
          '- Continued Behaviour: After WARN, take further action based on previous logs.\n\n' +
          '**Special Case:** If a newly created / troll account spams NSFW content, issue a direct ban.',
      },
    ],
  },
  {
    id: 'vc-exploitation',
    order: 4,
    title: '4. VC Exploitation / Following / Ear Rape',
    keywords: ['vc exploitation', 'following', 'ear rape', 'voice changer', 'abusing'],
    rules: [
      {
        id: '4.1',
        title: 'VC Following',
        keywords: ['vc following', 'following in vc'],
        body:
          '- First Offence: Issue Verbal Warn.\n' +
          '- Repetition: Issue Warn.\n' +
          '- Continued Behaviour: After WARN, take further action based on previous logs and severity.',
      },
      {
        id: '4.2',
        title: 'Abusing in VC',
        keywords: ['abusing in vc', 'slightly abusing'],
        body:
          '- First Time: Issue a VERBAL WARN and tell them the rules.\n' +
          '- Repetition: Issue a WARN.\n' +
          '**Leniency:** If the user is slightly abusing, you may issue a Verbal Warn + Manual.',
      },
      {
        id: '4.3',
        title: 'Using a Voice Changer',
        keywords: ['voice changer'],
        body:
          '- Issue Verbal Warn on First Offence.\n' +
          '- Repetition: Issue a Warn.',
      },
      {
        id: '4.4',
        title: 'Ear Rape & Abusing',
        keywords: ['ear rape', 'abusing', 'severity'],
        body:
          '**Action:** First Offence — Issue Verbal Warn or direct Warn (according to severity).',
      },
    ],
  },
  {
    id: 'targeting',
    order: 5,
    title: '5. Targeting / Poking / Hate Speech & Religious Debate',
    keywords: ['targeting', 'poking', 'hate speech', 'religious debate', 'harassing', 'body shaming'],
    rules: [
      {
        id: '5.1',
        title: 'Poking & Targeting in General Chat / VC',
        keywords: ['poking', 'targeting', 'friendly poking', 'slightly poking'],
        body:
          '- First Time: Issue a VERBAL WARN and tell them the rules.\n' +
          '- Repetition: Issue a WARN.\n\n' +
          '**Leniency Clause:** If the user is slightly poking or friendly poking, issue a Verbal Warn only.',
      },
      {
        id: '5.2',
        title: 'Harassing / Body Shaming / Hate Speech',
        keywords: ['harassing', 'body shaming', 'hate speech', 'severity'],
        body: '**Action:** Issue Verbal Warn or direct Warn (according to severity).',
      },
      {
        id: '5.3',
        title: 'Religious Debate',
        keywords: ['religious debate'],
        body:
          '- First Time: Issue a VERBAL WARN and ask the user to stop.\n' +
          '- Repetition: Issue a WARN.\n' +
          '- Continued Behaviour: After WARN, take further action based on previous logs and severity.',
      },
    ],
  },
  {
    id: 'doxxing',
    order: 6,
    title: '6. Doxxing / Impersonating',
    keywords: ['doxxing', 'impersonating', 'personal information'],
    rules: [
      {
        id: '6.1',
        title: 'Doxxing (Image / Video / Personal Information)',
        keywords: ['doxxing', 'personal information', 'image video', 'immediate ban', 'unintentional'],
        body:
          '**Action:** Issue immediate Ban.\n' +
          '**Leniency Clause:** If the user is streaming something and mistakenly or unintentionally invades info, you may issue a Warn instead of a Ban.',
      },
      {
        id: '6.2',
        title: 'Impersonating Without Concern',
        keywords: ['impersonating', 'impersonation', 'member concern', 'targeting'],
        body:
          '**Action:** At first offence, issue a VERBAL WARN and ask them to stop.\n' +
          'If the action is intentional and for targeting, issue a Warn or Ban according to situation and behaviour.',
      },
    ],
  },
  {
    id: 'punishment-summary',
    order: 7,
    title: '7. Punishment & Logging Summary',
    keywords: ['punishment ladder', 'logging protocols', 'manual logs', 'warn', 'mute', 'ban'],
    rules: [
      {
        id: '7.1',
        title: 'Punishment Ladder',
        keywords: ['punishment ladder', '1st warn', '2nd warn', '3rd warn', '4th warn', '5th warn', 'disclaimer warn'],
        body:
          '- 1st Warn – It’s a disclaimer warn without any punishment.\n' +
          '- 2nd Warn – 2h Mute\n' +
          '- 3rd Warn – 6h Mute\n' +
          '- 4th Warn – 12h Mute\n' +
          '- 5th Warn – Direct Ban\n\n' +
          '**Note:** If complaints are frequent or situations are extreme, the user will get banned immediately without going through the 5th Warn.',
      },
      {
        id: '7.2',
        title: 'Logging Protocols',
        keywords: ['logging protocols', 'manual logs channel', 'manuals reviewed', 'warn no manual'],
        body:
          '- All actions must be logged with Manuals and Reviewed in the #manual-logs channel.\n' +
          '- Warns do not need manuals.\n' +
          '- Manuals must be completed with proper information and actions.\n\n' +
          '**Note:** This staff guide is for reference purposes only — do not depend on it blindly; always use judgement and escalate to a senior mod when unsure.',
      },
    ],
  },
];

export function getAllRulesFlat(): { section: TrainingSection; rule: TrainingRule }[] {
  const out: { section: TrainingSection; rule: TrainingRule }[] = [];
  for (const section of TRAINING_SECTIONS) {
    for (const rule of section.rules) {
      out.push({ section, rule });
    }
  }
  return out;
}

export function getFullPolicyText(): string {
  return TRAINING_SECTIONS.map((section) => {
    const ruleText = section.rules
      .map((rule) => `${rule.id} ${rule.title}\n${rule.body}`)
      .join('\n\n');
    return `${section.title}\n\n${ruleText}`;
  }).join('\n\n---\n\n');
}
