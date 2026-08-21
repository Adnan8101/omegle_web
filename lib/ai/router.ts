import { callCerebras, callGemini, callGroq, callOpenRouter, ChatProvider } from './providers';

const CALLERS: Record<ChatProvider, (question: string, policyText: string) => Promise<string>> = {
  gemini: callGemini,
  groq: callGroq,
  cerebras: callCerebras,
  openrouter: callOpenRouter,
};

const DEFAULT_ORDER: ChatProvider[] = ['gemini', 'groq', 'cerebras', 'openrouter'];

function resolveOrder(): ChatProvider[] {
  const raw = process.env.AI_PROVIDER_ORDER;
  if (!raw) return DEFAULT_ORDER;
  const order = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ChatProvider => (DEFAULT_ORDER as string[]).includes(s));
  return order.length > 0 ? order : DEFAULT_ORDER;
}

export interface LLMAnswer {
  text: string;
  provider: ChatProvider;
}

export async function askLLM(question: string, policyText: string): Promise<LLMAnswer> {
  const order = resolveOrder();
  const errors: string[] = [];

  for (const provider of order) {
    try {
      const text = await CALLERS[provider](question, policyText);
      return { text, provider };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
}
