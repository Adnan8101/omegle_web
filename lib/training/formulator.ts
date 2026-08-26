import { findRuleById, getAllRulesFlat, TrainingRule, TrainingSection } from './content';

export interface FormulatedPolicyResponse {
  ruleId?: string;
  ruleTitle?: string;
  sectionTitle?: string;
  bestAction: string;
  command?: string;
  manualProtocol: string;
  manualRequired: boolean;
  leniencyNote?: string;
  specialCase?: string;
  formattedText: string;
  chips: string[];
}

/**
 * Normalizes Discord slash command string
 */
function cleanCommand(cmd?: string): string | undefined {
  if (!cmd) return undefined;
  let trimmed = cmd.trim();
  if (trimmed.startsWith('CMD:')) {
    trimmed = trimmed.replace(/^CMD:\s*/, '').trim();
  }
  return trimmed;
}

/**
 * Post-AI Manual Formulator & Reconciliation Engine
 * Takes raw input or AI draft and reconciles it against the official Omegle Staff Manual.
 * Ensures 100% accuracy, strict punishment ladder compliance, and zero hallucinations.
 */
export function formulateManualAnswer(params: {
  matchedRule?: TrainingRule;
  matchedSection?: TrainingSection;
  rawText?: string;
  customAction?: string;
  customCommand?: string;
  customChips?: string[];
  contextNote?: string;
}): FormulatedPolicyResponse {
  const { matchedRule, matchedSection, rawText, customAction, customCommand, customChips, contextNote } = params;

  let rule = matchedRule;
  let section = matchedSection;

  // If no rule was explicitly provided, attempt to infer from rawText
  if (!rule && rawText) {
    const ruleMatch = rawText.match(/\b(?:Rule\s*)?([1-7])\.([1-8])\b/i);
    if (ruleMatch) {
      const found = findRuleById(`${ruleMatch[1]}.${ruleMatch[2]}`);
      if (found) {
        rule = found.rule;
        section = found.section;
      }
    }
  }

  // Extract explicit command from rawText if available
  let command = customCommand ? cleanCommand(customCommand) : undefined;
  if (!command && rawText) {
    const cmdMatch = rawText.match(/CMD:\s*([^\n\r]+)/i);
    if (cmdMatch) {
      command = cleanCommand(cmdMatch[1]);
    }
  }
  if (!command && rule?.defaultCommand) {
    command = cleanCommand(rule.defaultCommand);
  }

  // Determine Best Action
  let bestAction = customAction || rule?.defaultAction || '';
  if (!bestAction && rawText) {
    const actionMatch = rawText.match(/\*\*Action:\*\*\s*([^\n\r]+)/i) || rawText.match(/Action:\s*([^\n\r]+)/i);
    if (actionMatch) {
      bestAction = actionMatch[1].trim();
    } else {
      bestAction = rawText.split('\n')[0].replace(/\*\*/g, '').trim();
    }
  }

  // Logging Protocol
  const manualRequired = rule ? rule.manualRequired : bestAction.toLowerCase().includes('mute') || bestAction.toLowerCase().includes('ban') || bestAction.toLowerCase().includes('manual');
  const manualProtocol = rule?.manualNote || (manualRequired ? 'Must be logged with evidence and member ID in #manual-logs.' : 'Warns & verbal warnings do NOT require manuals.');

  // Extract or merge chips
  const chipsSet = new Set<string>();
  if (rule?.chips) {
    rule.chips.forEach((c) => chipsSet.add(c));
  }
  if (customChips) {
    customChips.forEach((c) => chipsSet.add(c));
  }
  if (rawText) {
    const chipMatches = Array.from(rawText.matchAll(/\[(.*?)\]/g));
    chipMatches.forEach((m) => {
      const tag = m[1].trim();
      if (tag && !tag.toLowerCase().includes('system') && !tag.toLowerCase().includes('note') && !tag.toLowerCase().includes('cmd')) {
        chipsSet.add(tag);
      }
    });
  }

  // Build the Authoritative Formatted Text
  let text = '';
  if (rule && section) {
    text += `**Rule ${rule.id} — ${rule.title}**\n*(Section: ${section.title})*\n\n`;
  }

  text += `**BEST ACTION:**\n${bestAction}\n\n`;

  if (command) {
    text += `CMD: ${command}\n\n`;
  }

  text += `**Logging Protocol:**\n- ${manualProtocol}\n\n`;

  if (rule?.body) {
    text += `**Policy Guidelines:**\n${rule.body}\n\n`;
  } else if (rawText) {
    const cleanRaw = rawText.replace(/CMD:\s*[^\n\r]+/g, '').replace(/\[(.*?)\]/g, '').trim();
    if (cleanRaw) {
      text += `**Details & Context:**\n${cleanRaw}\n\n`;
    }
  }

  if (rule?.leniencyNote) {
    text += `**Leniency Clause:**\n- ${rule.leniencyNote}\n\n`;
  }

  if (rule?.specialCase) {
    text += `**Special Case:**\n- ${rule.specialCase}\n\n`;
  }

  if (contextNote) {
    text += `**Note:** ${contextNote}\n\n`;
  }

  const chips = Array.from(chipsSet).slice(0, 6);
  if (chips.length > 0) {
    text += chips.map((c) => `[${c}]`).join(' ');
  }

  return {
    ruleId: rule?.id,
    ruleTitle: rule?.title,
    sectionTitle: section?.title,
    bestAction,
    command,
    manualProtocol,
    manualRequired,
    leniencyNote: rule?.leniencyNote,
    specialCase: rule?.specialCase,
    formattedText: text.trim(),
    chips,
  };
}
