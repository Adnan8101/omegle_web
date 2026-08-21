import { prismaBot } from '@/lib/prismaBot';
import { tokenize } from './localAnswer';

export type ChatSource = 'local' | 'gemini' | 'groq' | 'cerebras' | 'openrouter';

const SIMILARITY_THRESHOLD = 0.82;
const MIN_TOKENS_FOR_CACHE = 3;
const RECENT_ROWS_TO_SCAN = 300;

export function normalizedKeyFor(question: string): string {
  const tokens = Array.from(new Set(tokenize(question))).sort();
  return tokens.join(' ');
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MemoryHit {
  id: string;
  answer: string;
  source: string;
  sectionIds: string[];
}

export async function findMemoryMatch(question: string): Promise<MemoryHit | null> {
  try {
    const questionTokenCount = new Set(tokenize(question)).size;
    if (questionTokenCount < MIN_TOKENS_FOR_CACHE) return null;

    const normalizedKey = normalizedKeyFor(question);
    if (!normalizedKey) return null;

    const exact = await prismaBot.trainingChatMemory.findUnique({ where: { normalized_key: normalizedKey } }).catch(() => null);
    if (exact) {
      await bumpHit(exact.id);
      return { id: exact.id, answer: exact.answer, source: exact.source, sectionIds: exact.section_ids };
    }

    const questionSet = new Set(tokenize(question));
    const recent = await prismaBot.trainingChatMemory.findMany({
      orderBy: { updated_at: 'desc' },
      take: RECENT_ROWS_TO_SCAN,
    }).catch(() => []);

    let best: { row: (typeof recent)[number]; similarity: number } | null = null;
    for (const row of recent) {
      const rowTokens = new Set(tokenize(row.question));
      const similarity = jaccard(questionSet, rowTokens);
      if (similarity >= SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
        best = { row, similarity };
      }
    }

    if (!best) return null;
    await bumpHit(best.row.id);
    return {
      id: best.row.id,
      answer: best.row.answer,
      source: best.row.source,
      sectionIds: best.row.section_ids,
    };
  } catch {
    return null;
  }
}

async function bumpHit(id: string): Promise<void> {
  await prismaBot.trainingChatMemory.update({
    where: { id },
    data: { hit_count: { increment: 1 } },
  }).catch(() => undefined);
}

export async function saveMemory(params: {
  question: string;
  answer: string;
  source: ChatSource;
  sectionIds: string[];
  askedBy?: string;
}): Promise<void> {
  if (new Set(tokenize(params.question)).size < MIN_TOKENS_FOR_CACHE) return;

  const normalizedKey = normalizedKeyFor(params.question);
  if (!normalizedKey) return;

  await prismaBot.trainingChatMemory.upsert({
    where: { normalized_key: normalizedKey },
    update: {
      hit_count: { increment: 1 },
    },
    create: {
      normalized_key: normalizedKey,
      question: params.question,
      answer: params.answer,
      source: params.source,
      section_ids: params.sectionIds,
      asked_by: params.askedBy,
    },
  }).catch(() => undefined);
}
