import { getAllRulesFlat, TrainingRule, TrainingSection } from './content';

export interface ChatMessageContext {
  role: 'user' | 'assistant';
  text: string;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'to', 'of', 'in', 'on', 'for', 'with', 'and', 'or',
  'if', 'so', 'we', 'i', 'you', 'they', 'he', 'she', 'it', 'what', 'when',
  'how', 'should', 'would', 'could', 'can', 'will', 'shall', 'this', 'that',
  'these', 'those', 'my', 'our', 'their', 'me', 'us', 'them', 'about', 'as',
  'at', 'by', 'from', 'up', 'out', 'someone', 'something', 'please', 'tell',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const RULE_ID_PATTERN = /\b([1-7])\.([1-8])\b/;

export interface LocalMatch {
  answer: string;
  ruleId?: string;
  confidence: 'exact' | 'scenario' | 'high' | 'medium';
}

function parseNumberFromText(text: string): number | null {
  const match = text.match(/\b(\d{1,7})\b/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Universal Moderation Manual & Scenario Intelligence Engine
 * Handles ANY question across all policy sections, mute ladders, warn ladders,
 * manual logging requirements, alt account protocols, and VC rules.
 */
export function evaluateScenario(messages: ChatMessageContext[]): LocalMatch | null {
  if (!messages || messages.length === 0) return null;

  const currentMsg = messages[messages.length - 1].text.trim();
  const currentLower = currentMsg.toLowerCase();

  // Extract last assistant message for multi-turn context
  let lastAssistantMsg = '';
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantMsg = messages[i].text.toLowerCase();
      break;
    }
  }

  // 1. Direct Rule Number Query (e.g. "1.1", "rule 2.2", "what is 5.3?")
  const ruleIdMatch = currentMsg.match(RULE_ID_PATTERN);
  if (ruleIdMatch) {
    const targetId = `${ruleIdMatch[1]}.${ruleIdMatch[2]}`;
    const hit = getAllRulesFlat().find(({ rule }) => rule.id === targetId);
    if (hit) {
      return {
        confidence: 'exact',
        ruleId: hit.rule.id,
        answer:
          '**Rule ' + hit.rule.id + ' — ' + hit.rule.title + '**\n' +
          '*(Section: ' + hit.section.title + ')*\n\n' +
          hit.rule.body + '\n\n' +
          '*Ask a follow-up if you need specific enforcement details!*',
      };
    }
  }

  // 2. Logging & Manuals Query (Rule 7.2 & General Protocol)
  if (
    currentLower.includes('manual') ||
    currentLower.includes('logging') ||
    currentLower.includes('log') ||
    currentLower.includes('#manual-logs') ||
    currentLower.includes('manuals channel')
  ) {
    return {
      confidence: 'scenario',
      ruleId: '7.2',
      answer:
        '**Rule 7.2 — Logging Protocols & Manual Requirements**\n\n' +
        '**Key Guidelines:**\n' +
        '- **Manual Logs Channel:** All moderation actions (mutes, bans, kicks) must be logged with Manuals and Reviewed in `#manual-logs`.\n' +
        '- **Warn Exception:** Warns do **NOT** require manuals.\n' +
        '- **Completeness:** Manuals must be completed with proper evidence, member IDs, and clear action reasons.\n' +
        '- **Golden Rule:** This guide is for reference — always use judgment and escalate to a Senior Mod when unsure.',
    };
  }

  // 3. Punishment Ladder & Mute Duration Queries (Rule 7.1 & Section 1)
  if (
    currentLower.includes('ladder') ||
    currentLower.includes('warn count') ||
    currentLower.includes('5th warn') ||
    currentLower.includes('how many warns') ||
    currentLower.includes('mute duration') ||
    currentLower.includes('max mute')
  ) {
    return {
      confidence: 'scenario',
      ruleId: '7.1',
      answer:
        '**Rule 7.1 — Official 5-Step Punishment Ladder**\n\n' +
        '1. **1st Warn:** Disclaimer Warn (No punishment).\n' +
        '2. **2nd Warn:** **2 Hours Mute**.\n' +
        '3. **3rd Warn:** **6 Hours Mute**.\n' +
        '4. **4th Warn:** **12 Hours Mute**.\n' +
        '5. **5th Warn:** **Direct BAN**.\n\n' +
        '**Note:** Frequent complaints or extreme situations warrant an immediate Direct BAN without going through all 5 warns.',
    };
  }

  // 4. NSFW Streaming & Media Scenarios (Rule 3.1, 3.2, 3.3)
  if (
    currentLower.includes('nsfw') ||
    currentLower.includes('nude') ||
    currentLower.includes('porn') ||
    currentLower.includes('naked') ||
    currentLower.includes('gore') ||
    currentLower.includes('sticker') ||
    currentLower.includes('emoji')
  ) {
    if (currentLower.includes('stream') || currentLower.includes('vc') || currentLower.includes('video') || currentLower.includes('public')) {
      if (currentLower.includes('accidental') || currentLower.includes('unintentional') || currentLower.includes('mistake')) {
        return {
          confidence: 'scenario',
          ruleId: '3.1',
          answer:
            '**Rule 3.1 Leniency Clause — Accidental NSFW Stream**\n\n' +
            '**Action:** Issue an official **WARN** (instead of a Ban).\n' +
            '**Condition:** Applicable if the stream or screen share was genuinely unintentional and stopped immediately.',
        };
      }
      return {
        confidence: 'scenario',
        ruleId: '3.1',
        answer:
          '**Rule 3.1 — NSFW Streaming in Public VC**\n\n' +
          '**Standard Action:** **Immediate BAN**.\n' +
          '**Leniency Clause:** If unintentional, issue a **WARN** instead.\n\n' +
          '*Select scenario condition:*\n' +
          '[Intentional NSFW Stream] [Accidental / Unintentional]',
      };
    }

    if (currentLower.includes('alt') || currentLower.includes('troll')) {
      return {
        confidence: 'scenario',
        ruleId: '3.3',
        answer:
          '**Rule 3.3 Special Case — Troll / Alt Account NSFW Spam**\n\n' +
          '**Action:** **Immediate BAN**.\n' +
          '**Details:** Newly created or troll accounts spamming NSFW media receive a direct ban immediately without warnings.',
      };
    }

    return {
      confidence: 'scenario',
      ruleId: '3.2',
      answer:
        '**Rule 3.2 & 3.3 — NSFW Emojis / Stickers / Images**\n\n' +
        '**Action Flow:**\n' +
        '1. **1st Offense:** Verbal Warn (Extreme case: direct WARN).\n' +
        '2. **Repetition:** Issue official WARN.\n' +
        '3. **Continued:** Action based on modlogs (Mute / Ban).\n' +
        '**Special Case:** Troll/alt accounts receive an **Immediate BAN**.',
    };
  }

  // 5. Doxxing & Impersonation Scenarios (Rule 6.1, 6.2)
  if (
    currentLower.includes('doxx') ||
    currentLower.includes('doxxing') ||
    currentLower.includes('personal info') ||
    currentLower.includes('leaking') ||
    currentLower.includes('impersonat')
  ) {
    if (currentLower.includes('accidental') || currentLower.includes('unintentional') || currentLower.includes('screen share')) {
      return {
        confidence: 'scenario',
        ruleId: '6.1',
        answer:
          '**Rule 6.1 Leniency Clause — Accidental Info Leak**\n\n' +
          '**Action:** Issue a **WARN** (instead of a Ban).\n' +
          '**Condition:** Applicable if the user mistakenly invaded private info while screen sharing.',
      };
    }

    if (currentLower.includes('impersonat')) {
      return {
        confidence: 'scenario',
        ruleId: '6.2',
        answer:
          '**Rule 6.2 — Impersonation Policy**\n\n' +
          '**1st Offense:** Issue a **VERBAL WARN** and tell them to stop.\n' +
          '**Targeting / Intentional:** Issue a **WARN** or **BAN** depending on severity.',
      };
    }

    return {
      confidence: 'scenario',
      ruleId: '6.1',
      answer:
        '**Rule 6.1 — Doxxing Policy**\n\n' +
        '**Standard Action:** **Immediate BAN**.\n' +
        '**Leniency Clause:** If info was mistakenly leaked during a stream, issue a **WARN** instead.\n\n' +
        '*Select scenario:*\n' +
        '[Intentional Doxxing] [Accidental Screen Share Leak]',
    };
  }

  // 6. Promotion, Poaching & Server Advertising (Rule 2.1, 2.2)
  const isPromoQuery =
    currentLower.includes('promo') ||
    currentLower.includes('poach') ||
    currentLower.includes('advertising') ||
    currentLower.includes('youtube') ||
    currentLower.includes('instagram') ||
    currentLower.includes('server link') ||
    currentLower.includes('invite link') ||
    currentLower.includes('discord.gg');

  const isPromoContext =
    isPromoQuery ||
    lastAssistantMsg.includes('server promo') ||
    lastAssistantMsg.includes('poaching') ||
    lastAssistantMsg.includes('members');

  if (isPromoContext) {
    const memberNum = parseNumberFromText(currentMsg);

    if (memberNum !== null) {
      if (memberNum >= 500) {
        return {
          confidence: 'scenario',
          ruleId: '2.1',
          answer:
            '**Heavy Server Promotion (' + memberNum.toLocaleString() + ' members)**\n\n' +
            '**Policy Action (Rule 2.1 & 2.2):**\n' +
            '- **High Member Server (>500 members):** Issue a **Direct BAN** or **WARN** depending on severity.\n' +
            '- **Steps:** Delete invite links, issue punishment command, and log details in #manual-logs.\n\n' +
            '*Check account status:*\n' +
            '[Alt / New Account] [Regular Server Member]',
        };
      } else {
        return {
          confidence: 'scenario',
          ruleId: '2.1',
          answer:
            '**Small/Medium Server Promo (' + memberNum + ' members)**\n\n' +
            '**Policy Action (Rule 2.1 & 2.2):**\n' +
            '- **1st Offense:** Issue a **VERBAL WARN + Manual** in chat to stop.\n' +
            '- **Repetition:** Issue an official **WARN**.\n' +
            '- **Continued:** Issue a **Direct BAN**.\n\n' +
            '*Note:* If created solely to advertise, BAN immediately regardless of count.\n' +
            '[User is Alt Account] [User Stopped] [User Continued]',
        };
      }
    }

    if (currentLower.includes('alt') || currentLower.includes('new account') || currentLower.includes('troll account')) {
      return {
        confidence: 'scenario',
        ruleId: '2.2',
        answer:
          '**Rule 2.2 Special Case — Alt Account Promotion**\n\n' +
          '**Action:** **BAN the account directly without any warning.**\n' +
          '**Reason:** Accounts created solely for self-promotion or server poaching receive an immediate permanent ban.',
      };
    }

    if (currentLower.includes('vc') || currentLower.includes('voice')) {
      return {
        confidence: 'scenario',
        ruleId: '2.1',
        answer:
          '**Rule 2.1 — Poaching / Server Promo in VC**\n\n' +
          '**Action Flow:**\n' +
          '- **First Offense:** Verbal Warn + Manual.\n' +
          '- **Repetition:** Direct BAN or WARN.\n\n' +
          '*Select server member count:*\n' +
          '[More than 500 members] [Less than 500 members] [Alt Account]',
      };
    }

    return {
      confidence: 'scenario',
      ruleId: '2.2',
      answer:
        '**Rule 2.2 — Self Promotion & Advertising**\n\n' +
        '**Action Flow:**\n' +
        '1. **1st Time:** Issue a **VERBAL WARN** to stop.\n' +
        '2. **Repetition:** Issue a **WARN**.\n' +
        '3. **Continued:** Direct **BAN**.\n\n' +
        '**Special Case:** Alt accounts or high-count servers (>500 members) receive a **Direct BAN** immediately.\n\n' +
        '*Select scenario:*\n' +
        '[1st Offense] [Repeat Offense] [Alt Account] [Server >500 members]',
    };
  }

  // 7. Spam & Mod Ping Mute Escalations (Rule 1.1 - 1.6)
  const isSpamQuery =
    currentLower.includes('spam') ||
    currentLower.includes('copy paste') ||
    currentLower.includes('long para') ||
    currentLower.includes('mod ping') ||
    currentLower.includes('troll ping');

  const isSpamContext = isSpamQuery || lastAssistantMsg.includes('spam') || lastAssistantMsg.includes('mute policy');

  if (isSpamContext) {
    if (currentLower.includes('troll ping') || currentLower.includes('mod ping')) {
      return {
        confidence: 'scenario',
        ruleId: '1.6',
        answer:
          '**Rule 1.6 — Troll Mod Ping Protocol**\n\n' +
          '**Initial Stage:** Starts with 2 manuals (No direct mute).\n' +
          '- **1st Offense:** Give **2 Manuals** (No mute).\n' +
          '- **2nd Offense:** Mute **1 Hour**.\n' +
          '- **3rd Offense:** Mute **2 Hours**.\n' +
          '- **4th Offense:** Mute **3 Hours**.\n' +
          '- **5th Offense:** Mute **6 Hours (MAX cap)**.\n\n' +
          '**Reset:** Counter resets after 14 days without pings.\n' +
          '**Vigorous Spam Exception:** If vigorously spamming pings, issue a direct mute immediately.',
      };
    }

    if (currentLower.includes('copy paste') || currentLower.includes('long para') || currentLower.includes('paragraph')) {
      return {
        confidence: 'scenario',
        ruleId: '1.5',
        answer:
          '**Rule 1.5 — Copy-Paste / Long Paragraph Spam**\n\n' +
          '**Action:** Direct Mute (No verbal warning, no manual).\n' +
          '- **1st Offense:** Mute **30 Minutes**.\n' +
          '- **2nd Offense (within 2 days):** Mute **1 Hour**.\n' +
          '- **3rd Offense:** Mute **2 Hours**.\n' +
          '- **4th Offense:** Mute **3 Hours**.\n' +
          '- **5th Offense:** Mute **6 Hours (MAX cap)**.\n\n' +
          '*Note:* Counter resets if 2 days pass without further offense.',
      };
    }

    return {
      confidence: 'scenario',
      ruleId: '1.1',
      answer:
        '**Rule 1.1–1.4 — General Spam Mute Escalation**\n\n' +
        '**Action Flow:**\n' +
        '- **1st Offense:** Verbal Warning in chat (No manual, no mute).\n' +
        '- **Continued After Verbal (or Muted in last 2 days):** Mute **30 Minutes**.\n' +
        '- **Escalation Ladder:** 30m → 1h → 2h → 3h → 6h (MAX cap).\n' +
        '- **Reset Condition:** Counter resets after 2 days without offenses.\n\n' +
        '*Select type of spam:*\n' +
        '[Normal Chat Spam] [Copy-Paste Paragraph] [Troll Mod Ping]',
    };
  }

  // 8. VC Exploitation, Voice Changer, Ear Rape (Rule 4.1 - 4.4)
  if (
    currentLower.includes('ear rape') ||
    currentLower.includes('voice changer') ||
    currentLower.includes('following') ||
    currentLower.includes('abusing in vc') ||
    currentLower.includes('soundboard')
  ) {
    if (currentLower.includes('following')) {
      return {
        confidence: 'scenario',
        ruleId: '4.1',
        answer:
          '**Rule 4.1 — VC Following**\n\n' +
          '- **1st Offense:** Issue Verbal Warn.\n' +
          '- **Repetition:** Issue WARN.\n' +
          '- **Continued:** Action based on previous logs and severity.',
      };
    }
    if (currentLower.includes('voice changer')) {
      return {
        confidence: 'scenario',
        ruleId: '4.3',
        answer:
          '**Rule 4.3 — Using a Voice Changer**\n\n' +
          '- **1st Offense:** Issue Verbal Warn.\n' +
          '- **Repetition:** Issue official WARN.',
      };
    }
    if (currentLower.includes('ear rape')) {
      return {
        confidence: 'scenario',
        ruleId: '4.4',
        answer:
          '**Rule 4.4 — Ear Rape & Abusing in VC**\n\n' +
          '**Action:** 1st Offense — Issue Verbal Warn or Direct WARN (according to severity).',
      };
    }
    return {
      confidence: 'scenario',
      ruleId: '4.2',
      answer:
        '**Rule 4.2 — Abusing in VC**\n\n' +
        '- **1st Time:** Issue Verbal Warn and tell them rules.\n' +
        '- **Repetition:** Issue WARN.\n' +
        '**Leniency:** If slightly abusing, issue Verbal Warn + Manual.',
    };
  }

  // 9. Targeting, Harassment & Religious Debate (Rule 5.1 - 5.3)
  if (
    currentLower.includes('poking') ||
    currentLower.includes('targeting') ||
    currentLower.includes('harass') ||
    currentLower.includes('hate speech') ||
    currentLower.includes('religion') ||
    currentLower.includes('religious') ||
    currentLower.includes('body shaming')
  ) {
    if (currentLower.includes('religion') || currentLower.includes('religious')) {
      return {
        confidence: 'scenario',
        ruleId: '5.3',
        answer:
          '**Rule 5.3 — Religious Debate**\n\n' +
          '- **1st Time:** Issue Verbal Warn and ask them to stop.\n' +
          '- **Repetition:** Issue WARN.\n' +
          '- **Continued:** Take action based on logs and severity.',
      };
    }
    if (currentLower.includes('harass') || currentLower.includes('hate speech') || currentLower.includes('body shaming')) {
      return {
        confidence: 'scenario',
        ruleId: '5.2',
        answer:
          '**Rule 5.2 — Harassing / Body Shaming / Hate Speech**\n\n' +
          '**Action:** Issue Verbal Warn or Direct WARN (according to severity).',
      };
    }
    return {
      confidence: 'scenario',
      ruleId: '5.1',
      answer:
        '**Rule 5.1 — Poking & Targeting**\n\n' +
        '- **1st Time:** Issue Verbal Warn and tell them rules.\n' +
        '- **Repetition:** Issue WARN.\n' +
        '**Leniency:** If slightly poking or friendly poking, issue Verbal Warn only.',
    };
  }

  // 10. Comprehensive Token Score Matcher
  const questionTokens = tokenize(currentMsg);
  if (questionTokens.length > 0) {
    const scored = getAllRulesFlat().map(({ section, rule }) => {
      let score = 0;
      const qSet = new Set(questionTokens);
      for (const kw of rule.keywords) {
        const hits = tokenize(kw).filter((t) => qSet.has(t)).length;
        score += hits * 2.5;
      }
      for (const t of tokenize(rule.title)) {
        if (qSet.has(t)) score += 1.5;
      }
      for (const t of tokenize(rule.body)) {
        if (qSet.has(t)) score += 0.5;
      }
      return { section, rule, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top && top.score >= 1.5) {
      return {
        confidence: 'high',
        ruleId: top.rule.id,
        answer:
          '**Rule ' + top.rule.id + ' — ' + top.rule.title + '**\n' +
          '*(Section: ' + top.section.title + ')*\n\n' +
          top.rule.body,
      };
    }
  }

  return null;
}
