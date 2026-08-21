'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { openTrainingChat, TrainingChatWidget } from '@/components/training/TrainingChatWidget';
import { TRAINING_SECTIONS, TrainingRule, TrainingSection } from '@/lib/training/content';
import { FormattedText } from '@/lib/training/format';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiBookOpen,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiMessageSquare,
  FiSearch,
  FiStar,
  FiX,
} from 'react-icons/fi';

function ruleMatches(rule: TrainingRule, term: string): boolean {
  const haystack = `${rule.id} ${rule.title} ${rule.body} ${rule.keywords.join(' ')}`.toLowerCase();
  return haystack.includes(term);
}

export default function TrainingPage() {
  return (
    <AuthGuard>
      <TrainingPageContent />
    </AuthGuard>
  );
}

function TrainingPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Starred Rules
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omegle_starred_rules');
      if (saved) setStarredIds(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const toggleStar = useCallback((ruleId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStarredIds((prev) => {
      const updated = prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId];
      try {
        localStorage.setItem('omegle_starred_rules', JSON.stringify(updated));
      } catch (e) {}
      triggerToast(updated.includes(ruleId) ? `Starred Rule ${ruleId}` : `Removed Rule ${ruleId}`);
      return updated;
    });
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2200);
  };

  const copyRule = (rule: TrainingRule, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(`Rule ${rule.id} — ${rule.title}\n\n${rule.body}`);
    setCopiedId(rule.id);
    triggerToast(`Copied Rule ${rule.id} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const term = searchTerm.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    return TRAINING_SECTIONS.map((section) => {
      if (activeCategory !== 'all' && activeCategory !== 'starred' && section.id !== activeCategory) {
        return { section, rules: [] };
      }

      let rules = section.rules;
      if (activeCategory === 'starred') {
        rules = rules.filter((r) => starredIds.includes(r.id));
      }

      if (term) {
        rules = rules.filter((rule) => ruleMatches(rule, term));
      }

      return { section, rules };
    }).filter(({ rules }) => rules.length > 0);
  }, [activeCategory, starredIds, term]);

  const totalRules = useMemo(
    () => TRAINING_SECTIONS.reduce((acc, sec) => acc + sec.rules.length, 0),
    []
  );

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))] apple-transition pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgb(var(--color-border))] pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Staff Training Guide
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
              Moderation policy reference & rules index. Search policies, lookup mute ladders, or consult the assistant.
            </p>
          </div>

          <button
            onClick={() => openTrainingChat()}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <FiMessageSquare className="w-4 h-4" />
            <span>Policy Assistant</span>
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search rules — e.g. spam, nsfw, doxxing, 1.6…"
              className="w-full rounded-2xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] pl-11 pr-10 py-3 text-sm text-[rgb(var(--color-text-primary))] placeholder:text-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 apple-transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))]"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clean Segmented Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap apple-transition ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))]'
              }`}
            >
              All Rules ({totalRules})
            </button>

            <button
              onClick={() => setActiveCategory('starred')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 apple-transition ${
                activeCategory === 'starred'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))]'
              }`}
            >
              <FiStar className={`w-3.5 h-3.5 ${starredIds.length > 0 ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>Starred ({starredIds.length})</span>
            </button>

            {TRAINING_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveCategory(sec.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap apple-transition ${
                  activeCategory === sec.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))]'
                }`}
              >
                {sec.title.split('.')[0]}. {sec.title.split(' ')[1]} ({sec.rules.length})
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredSections.length === 0 && (
          <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] text-center space-y-3">
            <FiBookOpen className="w-8 h-8 text-[rgb(var(--color-text-tertiary))] mx-auto" />
            <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">No policy rules found</h3>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] max-w-sm mx-auto">
              {activeCategory === 'starred'
                ? 'No rules bookmarked yet. Click the star icon on any rule to save it here.'
                : `No rules matched "${term}". Try searching for keywords like "mute", "ban", or "1.6".`}
            </p>
          </div>
        )}

        {/* Policy Sections */}
        <div className="space-y-6">
          {filteredSections.map(({ section, rules }) => {
            const isCollapsed = openSections[section.id] === false;

            return (
              <div
                key={section.id}
                className="glass-blue rounded-3xl border border-[rgb(var(--color-border))] shadow-apple-lg overflow-hidden apple-transition"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left apple-transition hover:bg-[rgb(var(--color-bg-tertiary))]"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">{section.title}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] font-medium border border-[rgb(var(--color-border))]">
                      {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
                    </span>
                  </div>
                  {!isCollapsed ? (
                    <FiChevronDown className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                  ) : (
                    <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                  )}
                </button>

                {/* Section Rules List */}
                {!isCollapsed && (
                  <div className="px-6 pb-6 space-y-6">
                    {rules.map((rule) => {
                      const isStarred = starredIds.includes(rule.id);

                      return (
                        <div
                          key={rule.id}
                          className="border-t border-[rgb(var(--color-border))] pt-5 first:border-t-0 first:pt-0 group"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {rule.id}
                              </span>
                              <h3 className="text-base font-semibold text-[rgb(var(--color-text-primary))]">
                                {rule.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => toggleStar(rule.id, e)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isStarred
                                    ? 'text-amber-500 bg-amber-500/10'
                                    : 'text-[rgb(var(--color-text-tertiary))] hover:text-amber-500 hover:bg-[rgb(var(--color-bg-tertiary))]'
                                }`}
                                title={isStarred ? 'Unstar Rule' : 'Star Rule'}
                              >
                                <FiStar className={`w-4 h-4 ${isStarred ? 'fill-amber-500' : ''}`} />
                              </button>

                              <button
                                onClick={(e) => copyRule(rule, e)}
                                className="p-1.5 rounded-lg text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                title="Copy Rule text"
                              >
                                {copiedId === rule.id ? (
                                  <FiCheck className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <FiCopy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="text-sm text-[rgb(var(--color-text-secondary))] pl-0.5">
                            <FormattedText text={rule.body} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Policy Assistant */}
      <TrainingChatWidget />

      {/* Clean Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-xs font-semibold shadow-apple-lg flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
