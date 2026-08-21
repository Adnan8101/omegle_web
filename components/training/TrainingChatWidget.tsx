'use client';

import { FormattedText } from '@/lib/training/format';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheck, FiCopy, FiMessageSquare, FiSend, FiTrash2, FiX } from 'react-icons/fi';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  source?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  cache: 'Instant · Known Answer',
  local: 'Policy Match',
  gemini: 'AI · Gemini',
  groq: 'AI · Groq',
  cerebras: 'AI · Cerebras',
  openrouter: 'AI · OpenRouter',
  fallback: 'Policy Fallback',
};

const SUGGESTED_PROMPTS = [
  'Someone is promoting a server in VC',
  'What is rule 1.6 for troll pings?',
  'What is the 5-step punishment ladder?',
  'First offense self promo in chat?',
];

export function openTrainingChat(question?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-training-chat', { detail: { question } }));
  }
}

function parseContent(text: string): { cleanText: string; chips: string[]; commands: string[] } {
  const chipMatches = Array.from(text.matchAll(/\[(.*?)\]/g));
  const chips = chipMatches
    .map((m) => m[1].trim())
    .filter((c) => c.length > 0 && !c.toLowerCase().includes('category') && !c.toLowerCase().includes('note') && !c.toLowerCase().includes('system hint'));
  
  const cmdMatches = Array.from(text.matchAll(/CMD:\s*(.+)/g));
  const commands = cmdMatches.map((m) => m[1].trim());

  const cleanText = text.replace(/\[(.*?)\]/g, '').replace(/CMD:\s*(.+)/g, '').trim();
  return { cleanText, chips, commands };
}

export function TrainingChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your **Policy Assistant**. Ask me any question about moderation rules, mute ladders, or escalation guidelines — e.g. "What is rule 1.6?" or "Someone is promoting a server in VC".',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, loading, scrollToBottom]);

  const sendMessage = useCallback(
    async (promptText?: string) => {
      const question = (promptText || input).trim();
      if (!question || loading) return;

      const nextUserMsg: ChatMessage = { role: 'user', text: question };
      const updatedMessages = [...messages, nextUserMsg];

      setMessages(updatedMessages);
      if (!promptText) setInput('');
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/training/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || 'Something went wrong while contacting the policy assistant.');
          return;
        }

        setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, source: data.source }]);
      } catch {
        setError('Network error — please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ question?: string }>;
      setOpen(true);
      if (custom.detail?.question) {
        setInput(custom.detail.question);
        sendMessage(custom.detail.question);
      } else {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };

    window.addEventListener('open-training-chat', handleCustomEvent);
    return () => window.removeEventListener('open-training-chat', handleCustomEvent);
  }, [sendMessage]);

  const copyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: 'Chat cleared. Ask me another scenario question whenever you need policy guidance!',
      },
    ]);
    setError(null);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 shadow-apple-lg apple-transition"
        aria-label="Ask Policy Assistant"
      >
        {open ? <FiX className="w-5 h-5" /> : <FiMessageSquare className="w-5 h-5" />}
        <span className="font-medium text-sm hidden sm:inline">{open ? 'Close Assistant' : 'Ask Assistant'}</span>
      </button>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-[60] w-[92vw] sm:w-[420px] h-[72vh] max-h-[620px] flex flex-col bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] shadow-2xl rounded-3xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[rgb(var(--color-text-primary))] text-sm">Policy Assistant</h3>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Instant guidance from staff training rules</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear Chat"
                  className="p-1.5 rounded-lg text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => {
                const { cleanText, chips, commands } = msg.role === 'assistant' ? parseContent(msg.text) : { cleanText: msg.text, chips: [], commands: [] };

                return (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`group relative max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))]'
                      }`}
                    >
                      <FormattedText text={cleanText} />

                      {/* Render Executable Commands */}
                      {msg.role === 'assistant' && commands.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {commands.map((cmd, cmdIdx) => (
                            <div key={`cmd-${cmdIdx}`} className="flex items-center justify-between gap-2 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-lg px-3 py-2">
                              <code className="text-xs font-mono text-emerald-500 font-bold">{cmd}</code>
                              <button
                                onClick={() => copyMessage(cmd, i * 1000 + cmdIdx)}
                                className="p-1 rounded hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:text-emerald-500 transition-colors"
                                title="Copy Command"
                              >
                                {copiedId === (i * 1000 + cmdIdx) ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Interactive Option Chips */}
                      {msg.role === 'assistant' && chips.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[rgb(var(--color-border))] flex flex-wrap gap-1.5">
                          {chips.map((chip, chipIdx) => (
                            <button
                              key={chipIdx}
                              onClick={() => sendMessage(chip)}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all text-left"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 pt-1.5 flex items-center justify-between gap-2 text-[10px] text-[rgb(var(--color-text-tertiary))]">
                        {msg.source && (
                          <span className="font-mono text-[10px] text-blue-500 font-medium">
                            {SOURCE_LABEL[msg.source] || msg.source}
                          </span>
                        )}
                        <button
                          onClick={() => copyMessage(cleanText, i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto hover:text-[rgb(var(--color-text-primary))] flex items-center gap-1"
                        >
                          {copiedId === i ? (
                            <>
                              <FiCheck className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <FiCopy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-sm text-[rgb(var(--color-text-tertiary))]">
                    Thinking…
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 text-center">
                  {error}
                </div>
              )}
            </div>

            {/* Suggested Prompts */}
            {messages.length <= 2 && !loading && (
              <div className="px-4 py-2 border-t border-[rgb(var(--color-border))]">
                <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] mb-1.5 font-medium">Suggested queries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(prompt);
                        sendMessage(prompt);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-blue-500/10 hover:text-blue-500 text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))] transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-[rgb(var(--color-border))] flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about a rule or scenario…"
                maxLength={500}
                className="flex-1 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] px-4 py-2 text-sm text-[rgb(var(--color-text-primary))] placeholder:text-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all"
                aria-label="Send"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
