export type ChatProvider = 'gemini' | 'groq' | 'cerebras' | 'openrouter';

const TIMEOUT_MS = 45_000;

function buildSystemPrompt(policyText: string): string {
  return (
    'You are an elite, highly structured compliance AI for a Discord server moderation team. ' +
    'Answer questions ONLY using the provided moderation policy. ' +
    'You MUST format your responses strictly as follows, with no conversational rambling: ' +
    '\n\n' +
    '1. **Rule & Title:** (e.g., Rule 5.2 — Harassing)\n' +
    '2. **Action:** (e.g., Ban, 30m Mute, Verbal Warn)\n' +
    '3. **Command:** If a punishment is required, you MUST provide the exact discord command to run on a new line starting with `CMD: `, e.g., `CMD: /timeout @user 30m Spamming` or `CMD: /ban @user Doxxing`.\n' +
    '4. **Leniency / Notes:** Explain any leniency clauses or how to stack punishments for multiple violations.\n\n' +
    'If the scenario is missing critical details (like whether it was an alt account, or member count), you MUST ask a clarifying question and provide clickable options in brackets at the very end of your message, e.g.: `[It was an Alt Account]` `[Normal Member]`.\n\n' +
    'If the question cannot be answered from this policy, say you are not sure and recommend escalating to a Senior Moderator.\n\n' +
    '--- MODERATION POLICY START ---\n' +
    policyText +
    '\n--- MODERATION POLICY END ---'
  );
}

const INTENT_CLASSIFIER_SYSTEM_PROMPT =
  'You are an NLP tagger. Output ONLY a comma-separated list of tags for the given moderation issue. ' +
  'Available tags: [NSFW], [SERIOUS], [POTENTIAL DOXXING], [SPAM], [VC ABUSE]. ' +
  'If none match, output [GENERAL]. Do not output conversational text, explanations, or formatting of any kind — just the tags.';

export async function callIntentClassifier(question: string): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];
  try {
    const text = await callOpenAICompatible({
      provider: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      question,
      systemPrompt: INTENT_CLASSIFIER_SYSTEM_PROMPT,
    });
    return text.split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAICompatible(params: {
  provider: ChatProvider;
  url: string;
  apiKey: string;
  model: string;
  question: string;
  systemPrompt: string;
}): Promise<string> {
  const response = await fetchWithTimeout(params.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.question },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`[${params.provider}] request failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error(`[${params.provider}] returned no content`);
  }
  return text.trim();
}

export async function callGemini(question: string, policyText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[gemini] missing GEMINI_API_KEY');
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(policyText) }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`[gemini] request failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('[gemini] returned no content');
  }
  return text.trim();
}

export async function callGroq(question: string, policyText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('[groq] missing GROQ_API_KEY');
  return callOpenAICompatible({
    provider: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    question,
    systemPrompt: buildSystemPrompt(policyText),
  });
}

export async function callCerebras(question: string, policyText: string): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error('[cerebras] missing CEREBRAS_API_KEY');
  return callOpenAICompatible({
    provider: 'cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    apiKey,
    model: process.env.CEREBRAS_MODEL || 'llama3.1-8b',
    question,
    systemPrompt: buildSystemPrompt(policyText),
  });
}

export async function callOpenRouter(question: string, policyText: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('[openrouter] missing OPENROUTER_API_KEY');
  return callOpenAICompatible({
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    question,
    systemPrompt: buildSystemPrompt(policyText),
  });
}
