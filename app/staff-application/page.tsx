'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiClock, FiLock, FiLogOut, FiUsers } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import Atmosphere from '@/components/shop/Atmosphere';
import ApplicationForm, { type ProfileData } from './_components/ApplicationForm';
import ApplicationHero from './_components/ApplicationHero';
import GatePanel from './_components/GatePanel';
import RoleGrid from './_components/RoleGrid';
import SuccessOverlay from './_components/SuccessOverlay';
import { COMMON_QUESTIONS, getRoleMeta, ROLE_QUESTIONS, STAFF_ROLES, type StaffRole } from '@/lib/staffApplicationForm';

interface RoleFormSetting {
  isOpen: boolean;
  closedMessage?: string;
}

type Step = 'terms' | 'signin' | 'roles' | 'role-closed' | 'form';

const DEFAULT_ROLE_FORMS: Record<StaffRole, RoleFormSetting> = STAFF_ROLES.reduce(
  (acc, role) => {
    acc[role.id] = { isOpen: true, closedMessage: '' };
    return acc;
  },
  {} as Record<StaffRole, RoleFormSetting>
);

const EASE = [0.22, 1, 0.36, 1] as const;

export default function StaffApplicationPage() {
  const { data: session, status } = useSession();
  const reduce = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState(
    'Staff applications are currently closed. Please check back later.'
  );
  const [roleForms, setRoleForms] = useState<Record<StaffRole, RoleFormSetting>>(DEFAULT_ROLE_FORMS);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [roleClosedNotice, setRoleClosedNotice] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({ country: '', timezone: '', age: '' });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        const result = await response.json();
        if (cancelled) return;
        if (result.success && result.data) {
          setApplicationsOpen(result.data.isOpen);
          setClosedMessage(result.data.closedMessage || closedMessage);
          if (result.data.roleForms) {
            setRoleForms((prev) => {
              const next = { ...prev };
              for (const role of STAFF_ROLES) {
                const incoming = result.data.roleForms?.[role.id];
                if (incoming) {
                  next[role.id] = {
                    isOpen: typeof incoming.isOpen === 'boolean' ? incoming.isOpen : true,
                    closedMessage: incoming.closedMessage || '',
                  };
                }
              }
              return next;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load staff application settings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCount = useMemo(() => STAFF_ROLES.filter((role) => roleForms[role.id]?.isOpen ?? true).length, [roleForms]);

  const step: Step = useMemo(() => {
    if (!agreedToTerms) return 'terms';
    if (status !== 'authenticated') return 'signin';
    if (!selectedRole) return 'roles';
    if (!(roleForms[selectedRole]?.isOpen ?? true)) return 'role-closed';
    return 'form';
  }, [agreedToTerms, status, selectedRole, roleForms]);

  const handleSelectRole = useCallback(
    (role: StaffRole) => {
      const setting = roleForms[role];
      setSelectedRole(role);
      if (setting && !setting.isOpen) {
        setRoleClosedNotice('');
        return;
      }
      const ids = [...COMMON_QUESTIONS, ...ROLE_QUESTIONS[role]].map((question) => question.id);
      setAnswers((prev) => {
        const next = { ...prev };
        for (const id of ids) if (!(id in next)) next[id] = '';
        return next;
      });
    },
    [roleForms]
  );

  const handleSubmit = useCallback(async (): Promise<string | null> => {
    if (!selectedRole || !session?.user?.id) return 'Please login with Discord before submitting.';
    const introduction = answers.introduction_purpose || '';
    const dailyAvailability = answers.daily_availability || '';
    const payload = {
      formVersion: 2,
      applicationRole: selectedRole,
      discordUsername: session.user.name || '',
      discordUserId: session.user.id,
      country: profileData.country.trim(),
      timezone: profileData.timezone.trim(),
      age: profileData.age.trim(),
      aboutYourself: introduction,
      whyJoin: introduction,
      dailyAvailability,
      hoursPerWeek: dailyAvailability,
      roleAnswers: Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, value.trim()])),
      moderationExperience: answers.moderation_experience || '',
      moderatorDefinition: answers.moderator_definition || '',
      leadershipExperience: answers.leadership_experience || '',
      discordBotExperience: answers.discord_bot_experience || '',
      automodKnowledge: answers.automod_knowledge || '',
      moderationBotsFamiliarity: answers.moderation_bots_familiarity || '',
      modCommandsKnowledge: answers.mod_commands_knowledge || '',
    };

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        return result.error || 'Failed to submit application. Please try again.';
      }
      setShowSuccess(true);
      setSelectedRole(null);
      setAgreedToTerms(false);
      setProfileData({ country: '', timezone: '', age: '' });
      setAnswers({});
      return null;
    } catch (error) {
      console.error('Failed to submit staff application:', error);
      return 'Network error while submitting your application. Please try again.';
    }
  }, [selectedRole, session, profileData, answers]);

  const selectedRoleMeta = selectedRole ? getRoleMeta(selectedRole) : undefined;
  const selectedRoleClosedMessage =
    (selectedRole && roleForms[selectedRole]?.closedMessage?.trim()) ||
    `${selectedRoleMeta?.label || 'This role'} applications are currently closed.`;

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-x-clip bg-black">
        <Atmosphere />
        <span className="relative h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      </main>
    );
  }

  if (!applicationsOpen) {
    return (
      <main className="relative min-h-screen overflow-x-clip bg-black">
        <Atmosphere />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-24">
          <GatePanel
            icon={<FiLock className="h-6 w-6" />}
            eyebrow="Applications closed"
            title="Not accepting applications right now"
            body={closedMessage}
            accent="#A78BFA"
          >
            <Link
              href="/"
              className="fx-focus inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
            >
              Return home
            </Link>
          </GatePanel>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-clip bg-black pb-24">
      <Atmosphere />
      <ApplicationHero openCount={openCount} totalCount={STAFF_ROLES.length} />

      <div className="relative z-10 mx-auto mt-12 w-full max-w-[880px] px-5 sm:px-8">
        <AnimatePresence mode="wait">
          {step === 'terms' && (
            <motion.div
              key="terms"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <GatePanel
                icon={<FiUsers className="h-6 w-6" />}
                eyebrow="Before you start"
                title="Terms of service"
                body="A few ground rules for anyone joining the team — read them, then continue."
                accent="#A78BFA"
              >
                <div className="mx-auto max-h-56 max-w-md space-y-3.5 overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left text-[13px] leading-relaxed text-white/55">
                  <p><span className="font-bold text-white/85">Professional conduct.</span> Stay respectful, impartial, and responsible in every community interaction.</p>
                  <p><span className="font-bold text-white/85">Confidentiality.</span> Internal decisions and staff conversations stay private.</p>
                  <p><span className="font-bold text-white/85">Activity.</span> Every role requires consistent, reliable activity.</p>
                  <p><span className="font-bold text-white/85">Accuracy.</span> Applications must be truthful and submitted from your own Discord account.</p>
                </div>
                <TermsCheckbox onAgree={() => setAgreedToTerms(true)} />
              </GatePanel>
            </motion.div>
          )}

          {step === 'signin' && (
            <motion.div
              key="signin"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <GatePanel
                icon={<FaDiscord className="h-6 w-6" />}
                eyebrow="One more step"
                title="Sign in with Discord"
                body="Applications are tied to your Discord account so we can verify your identity and reach you."
                accent="#5865F2"
              >
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => setAgreedToTerms(false)}
                    className="fx-focus inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-[13px] font-bold text-white/60 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn('discord')}
                    className="fx-focus inline-flex items-center justify-center gap-2 rounded-full bg-[#5865F2] px-7 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-[#4752C4]"
                  >
                    <FaDiscord className="h-4 w-4" />
                    Continue with Discord
                  </button>
                </div>
              </GatePanel>
            </motion.div>
          )}

          {step === 'roles' && (
            <motion.div
              key="roles"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="mb-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/staff-application' })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3.5 py-2 text-[11.5px] font-bold text-red-300 transition-colors hover:bg-red-400/15"
                >
                  <FiLogOut className="h-3 w-3" />
                  Logout
                </button>
              </div>
              <RoleGrid roleForms={roleForms} closedNotice={roleClosedNotice} onSelect={handleSelectRole} />
            </motion.div>
          )}

          {step === 'role-closed' && selectedRoleMeta && (
            <motion.div
              key="role-closed"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <GatePanel
                icon={<FiClock className="h-6 w-6" />}
                eyebrow={`${selectedRoleMeta.label} · closed`}
                title="This role isn't taking applications"
                body={selectedRoleClosedMessage}
                accent={selectedRoleMeta.accent}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="fx-focus inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
                >
                  Choose another role
                </button>
              </GatePanel>
            </motion.div>
          )}

          {step === 'form' && selectedRoleMeta && session && (
            <motion.div
              key="form"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <ApplicationForm
                role={selectedRoleMeta}
                session={session}
                profileData={profileData}
                onProfileChange={setProfileData}
                answers={answers}
                onAnswerChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
                onChangeRole={() => setSelectedRole(null)}
                onSubmit={handleSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SuccessOverlay open={showSuccess} onClose={() => setShowSuccess(false)} />
    </main>
  );
}

function TermsCheckbox({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="mt-7 space-y-5">
      <label className="mx-auto flex max-w-md cursor-pointer items-start gap-3 text-left select-none">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => setChecked((prev) => !prev)}
          className="fx-focus mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-200"
          style={{
            borderColor: checked ? '#A78BFA' : 'rgba(255,255,255,0.25)',
            background: checked ? '#A78BFA' : 'transparent',
          }}
        >
          {checked && <span className="h-2 w-2 rounded-[2px] bg-black" />}
        </button>
        <span className="text-[13.5px] leading-relaxed text-white/60">I have read and agree to the terms above.</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={onAgree}
        className="fx-focus mx-auto flex w-full max-w-md items-center justify-center rounded-full bg-white py-3.5 text-[14px] font-extrabold text-black transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
