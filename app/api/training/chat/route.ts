import { askLLM } from '@/lib/ai/router';
import { callIntentClassifier } from '@/lib/ai/providers';
import { authOptions } from '@/lib/auth';
import { isLocalDevBypass } from '@/lib/devAuth';
import { prismaBot } from '@/lib/prismaBot';
import { getFullPolicyText } from '@/lib/training/content';
import { ChatMessageContext, evaluateScenario } from '@/lib/training/localAnswer';
import { findMemoryMatch, saveMemory } from '@/lib/training/memory';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const MAX_QUESTION_LENGTH = 500;

async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const existing = await prismaBot.trainingChatRateLimit.findUnique({ where: { user_id: userId } });

    if (!existing || now.getTime() - existing.window_start.getTime() > RATE_LIMIT_WINDOW_MS) {
      await prismaBot.trainingChatRateLimit.upsert({
        where: { user_id: userId },
        update: { window_start: now, count: 1 },
        create: { user_id: userId, window_start: now, count: 1 },
      });
      return true;
    }

    if (existing.count >= RATE_LIMIT_MAX) return false;

    await prismaBot.trainingChatRateLimit.update({
      where: { user_id: userId },
      data: { count: { increment: 1 } },
    });
    return true;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    const isDev = process.env.NODE_ENV === 'development' || isLocalDevBypass;

    if (!isDev && (!session || !perms?.hasAnyAccess)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session?.user?.id || 'dev-user';
    const body = await request.json().catch(() => null);

    let messages: ChatMessageContext[] = [];
    if (Array.isArray(body?.messages)) {
      messages = body.messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: typeof m.text === 'string' ? m.text : '',
      })).filter((m: ChatMessageContext) => m.text.trim().length > 0);
    } else if (typeof body?.message === 'string' && body.message.trim()) {
      messages = [{ role: 'user', text: body.message.trim() }];
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'message or messages required' }, { status: 400 });
    }

    const lastMsg = messages[messages.length - 1].text.trim();
    if (lastMsg.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: 'message is too long' }, { status: 400 });
    }

    // 1. Rate Limit Check for complex / LLM queries
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'You are asking too quickly — please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    // A follow-up turn depends on prior conversation context, so it must never be
    // served from (or written to) the flat question->answer memory cache — the
    // cache has no notion of "what was said before" and would return answers to
    // an unrelated earlier conversation that merely used similar words.
    const isFollowUp = messages.length > 1;

    // 2. Fast Local Decision Engine — deterministic, hand-authored policy answers.
    const localMatch = evaluateScenario(messages);

    // 2a. Exact rule lookups and curated scenario matches are already the
    // authoritative policy text — return them directly instead of routing
    // through an LLM that could paraphrase, omit, or hallucinate details.
    if (localMatch && (localMatch.confidence === 'exact' || localMatch.confidence === 'scenario')) {
      if (!isFollowUp) {
        await saveMemory({ question: lastMsg, answer: localMatch.answer, source: 'local', sectionIds: localMatch.ruleId ? [localMatch.ruleId] : [], askedBy: userId });
      }
      return NextResponse.json({ answer: localMatch.answer, source: 'local' });
    }

    // 2b. Memory cache — only for fresh, single-turn questions (see isFollowUp above).
    if (!isFollowUp) {
      const memoryHit = await findMemoryMatch(lastMsg);
      if (memoryHit) {
        console.log(`[training/chat] Memory cache hit (source: ${memoryHit.source}).`);
        return NextResponse.json({ answer: memoryHit.answer, source: 'cache' });
      }
    }

    // 3. NLP Pass 1: Intent Classification — only worth the call once we know
    // we're actually falling through to the LLM.
    console.log('[training/chat] Hitting NLP classifier for intent tags...');
    const intentTags = await callIntentClassifier(lastMsg);
    console.log(`[training/chat] NLP Tags extracted: ${intentTags.join(', ')}`);

    let systemHint = '';
    if (localMatch) {
      console.log(`[training/chat] Local engine matched Rule ${localMatch.ruleId} (confidence: ${localMatch.confidence}). Injecting hint.`);
      systemHint = `\n\n[SYSTEM HINT: The following rule strongly applies to the user's situation. Incorporate this naturally into your answer:\n${localMatch.answer}\n]`;
    }

    if (intentTags.length > 0) {
      systemHint += `\n\n[NLP CONTEXT: The user query was tagged as: ${intentTags.join(', ')}. Use this to determine severity and context.]`;
    }

    // 4. Fallback to external LLM router with conversational nuance
    try {
      console.log('[training/chat] Hitting LLM...');
      const prompt = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + systemHint;
      const { text, provider } = await askLLM(prompt, getFullPolicyText());

      console.log(`[training/chat] LLM responded via ${provider}. Storing answer to memory (upsert)...`);
      if (!isFollowUp) {
        await saveMemory({ question: lastMsg, answer: text, source: provider, sectionIds: localMatch?.ruleId ? [localMatch.ruleId] : [], askedBy: userId });
      }

      return NextResponse.json({ answer: text, source: provider });
    } catch (llmError) {
      console.error('[training/chat] all AI providers failed:', llmError);
      // Even a low-confidence local match beats a generic apology — it's still
      // drawn straight from the actual policy text.
      if (localMatch) {
        return NextResponse.json({ answer: localMatch.answer, source: 'local' });
      }
      return NextResponse.json({
        answer:
          "I couldn't find a confident answer in the policy for that, and the AI backup is unavailable right now. Please ask a senior moderator directly.",
        source: 'fallback',
      });
    }
  } catch (error) {
    console.error('[training/chat] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
