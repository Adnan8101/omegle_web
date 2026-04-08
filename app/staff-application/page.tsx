'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { FiArrowLeft, FiCheckCircle, FiLock, FiSend, FiShield, FiUser } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { COMMON_QUESTIONS, ROLE_QUESTIONS, STAFF_ROLES, StaffRole, getRoleLabel } from '@/lib/staffApplicationForm';

type RoleFormSetting = {
  isOpen: boolean;
  closedMessage?: string;
};

interface AppSettingsResponse {
  success: boolean;
  data?: {
    isOpen: boolean;
    closedMessage?: string;
    roleForms?: Partial<Record<StaffRole, RoleFormSetting>>;
  };
}

interface SubmitResponse {
  success: boolean;
  error?: string;
}

export default function StaffApplicationPage() {
  const { theme } = useTheme();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState('Staff applications are currently closed. Please check back later.');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [agreedToTOS, setAgreedToTOS] = useState(false);
  const [showFormFlow, setShowFormFlow] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [roleClosedNotice, setRoleClosedNotice] = useState('');
  const [roleForms, setRoleForms] = useState<Record<StaffRole, RoleFormSetting>>({
    moderation: { isOpen: true, closedMessage: '' },
    event_team: { isOpen: true, closedMessage: '' },
    gaming_mod: { isOpen: true, closedMessage: '' },
    media_team: { isOpen: true, closedMessage: '' },
    entertainment_team: { isOpen: true, closedMessage: '' },
  });

  const [profileData, setProfileData] = useState({
    country: '',
    timezone: '',
    age: '',
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const activeQuestions = useMemo(() => {
    if (!selectedRole) return [];
    return [...COMMON_QUESTIONS, ...ROLE_QUESTIONS[selectedRole]];
  }, [selectedRole]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        const result: AppSettingsResponse = await response.json();
        if (result.success && result.data) {
          setIsApplicationsOpen(result.data.isOpen);
          setClosedMessage(result.data.closedMessage || 'Staff applications are currently closed. Please check back later.');
          if (result.data.roleForms) {
            setRoleForms((prev) => {
              const next = { ...prev };
              for (const role of STAFF_ROLES) {
                const incoming = result.data?.roleForms?.[role.id];
                if (!incoming) continue;
                next[role.id] = {
                  isOpen: typeof incoming.isOpen === 'boolean' ? incoming.isOpen : true,
                  closedMessage: incoming.closedMessage || '',
                };
              }
              return next;
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch staff application settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const resetFlow = () => {
    setShowFormFlow(false);
    setSelectedRole(null);
    setRoleClosedNotice('');
    setAgreedToTOS(false);
    setProfileData({ country: '', timezone: '', age: '' });
    setAnswers({});
  };

  const handleRoleSelect = (role: StaffRole) => {
    const roleSetting = roleForms[role];
    if (roleSetting && !roleSetting.isOpen) {
      setSelectedRole(null);
      setRoleClosedNotice(
        roleSetting.closedMessage || `${getRoleLabel(role)} applications are currently closed.`
      );
      return;
    }

    setRoleClosedNotice('');
    setSelectedRole(role);
    setAnswers((prev) => {
      const next = { ...prev };
      const questionIds = [...COMMON_QUESTIONS, ...ROLE_QUESTIONS[role]].map((question) => question.id);
      for (const id of questionIds) {
        if (!next[id]) next[id] = '';
      }
      return next;
    });
  };

  const selectedRoleSetting = selectedRole ? roleForms[selectedRole] : null;
  const isSelectedRoleClosed = Boolean(selectedRoleSetting && !selectedRoleSetting.isOpen);
  const selectedRoleClosedMessage =
    (selectedRoleSetting?.closedMessage || '').trim() ||
    (selectedRole ? `${getRoleLabel(selectedRole)} applications are currently closed.` : 'This application form is currently closed.');

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const validateForm = (): string | null => {
    if (!session?.user?.id) return 'Please login with Discord before submitting.';
    if (!selectedRole) return 'Please select one role before filling the form.';
    if (!profileData.country.trim()) return 'Country is required.';
    if (!profileData.timezone.trim()) return 'Timezone is required.';
    if (!profileData.age.trim()) return 'Age is required.';

    for (const question of activeQuestions) {
      if (!answers[question.id]?.trim()) {
        return `Please answer: ${question.title}`;
      }
    }

    return null;
  };

  const buildPayload = () => {
    const introduction = answers.introduction_purpose || '';
    const dailyAvailability = answers.daily_availability || '';

    return {
      formVersion: 2,
      applicationRole: selectedRole,

      discordUsername: session?.user?.name || '',
      discordUserId: session?.user?.id || '',

      country: profileData.country.trim(),
      timezone: profileData.timezone.trim(),
      age: profileData.age.trim(),

      aboutYourself: introduction,
      whyJoin: introduction,
      dailyAvailability,
      hoursPerWeek: dailyAvailability,

      roleAnswers: Object.fromEntries(
        Object.entries(answers).map(([key, value]) => [key, value.trim()])
      ),

      moderationExperience: answers.moderation_experience || '',
      moderatorDefinition: answers.moderator_definition || '',
      leadershipExperience: answers.leadership_experience || '',
      discordBotExperience: answers.discord_bot_experience || '',
      automodKnowledge: answers.automod_knowledge || '',
      moderationBotsFamiliarity: answers.moderation_bots_familiarity || '',
      modCommandsKnowledge: answers.mod_commands_knowledge || '',
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload()),
      });

      const result: SubmitResponse = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || 'Failed to submit application. Please try again.');
        return;
      }

      setShowSuccessModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      resetFlow();
    } catch (error) {
      console.error('Failed to submit staff application:', error);
      alert('Network error while submitting your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[rgb(var(--color-accent))] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] relative overflow-hidden">
      {theme === 'light' && (
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '1.8s' }} />
          <div className="absolute -bottom-8 left-24 w-96 h-96 bg-sky-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto animate-fade-in" onClick={(event) => event.target === event.currentTarget && setShowSuccessModal(false)}>
          <div className="min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="glass-blue rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-blue-glow max-w-md w-full sm:my-4 animate-scale-in">
              <div className="w-12 h-1.5 bg-gray-400/30 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <FiCheckCircle className="w-9 h-9 text-green-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">Application Submitted</h2>
                  <p className="text-[rgb(var(--color-text-secondary))]">
                    Your staff application has been received successfully.
                  </p>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                    If shortlisted, you will be contacted within 2 weeks.
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-6 py-3 rounded-2xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {!isApplicationsOpen ? (
          <section className="text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="relative w-52 h-52 sm:w-72 sm:h-72 animate-float">
                <Image src="/Resume folder-bro.svg" alt="Applications Closed" fill className="object-contain" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">Applications Closed</h1>
              <p className="text-base sm:text-xl text-[rgb(var(--color-text-secondary))] max-w-2xl mx-auto font-light px-3">
                {closedMessage}
              </p>
              <Link href="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-8 py-4 rounded-2xl transition-all shadow-apple-md hover:shadow-blue-glow mt-4">
                Return Home
              </Link>
            </div>
          </section>
        ) : (
          <section className="animate-fade-in space-y-7">
            <header className="text-center space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">Staff Application</h1>
              <p className="text-base sm:text-xl text-[rgb(var(--color-text-secondary))] max-w-3xl mx-auto font-light px-2">
                Select a team role, answer the dedicated form, and submit through your Discord login.
              </p>
            </header>

            {!showFormFlow ? (
              <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Terms of Service</h2>
                <div className="space-y-4 text-[rgb(var(--color-text-secondary))] max-h-80 overflow-y-auto pr-1 text-sm leading-relaxed">
                  <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">1. Professional Conduct:</span> Staff members must remain respectful, impartial, and responsible in all community interactions.</p>
                  <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">2. Confidentiality:</span> Internal decisions and staff conversations are private and cannot be shared externally.</p>
                  <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">3. Activity:</span> Consistent activity is required for all selected staff roles.</p>
                  <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">4. Accuracy:</span> Application details must be truthful and submitted by your own Discord account.</p>
                </div>
                <div className="pt-4 border-t border-[rgb(var(--color-border))] space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTOS}
                      onChange={(event) => setAgreedToTOS(event.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-2 border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))]">
                      I have read and agree to the terms.
                    </span>
                  </label>
                  <button
                    onClick={() => {
                      if (!agreedToTOS) {
                        alert('Please agree to the Terms of Service before continuing.');
                        return;
                      }
                      setShowFormFlow(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-8 py-4 rounded-2xl transition-all shadow-apple-md hover:shadow-blue-glow"
                  >
                    Continue to Role Selection
                  </button>
                </div>
              </div>
            ) : !session ? (
              <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md text-center space-y-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#5865F2]/20">
                  <FiLock className="w-7 h-7 text-[#5865F2]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Discord Login Required</h2>
                  <p className="text-[rgb(var(--color-text-secondary))] max-w-xl mx-auto">
                    Please login with your Discord account to continue and submit your application.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowFormFlow(false)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-secondary))] transition-all"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn('discord')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition-all"
                  >
                    Login with Discord
                  </button>
                </div>
              </div>
            ) : !selectedRole ? (
              <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Choose Your Team Role</h2>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/staff-application' })}
                    className="text-xs sm:text-sm px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                  >
                    Logout
                  </button>
                </div>
                <p className="text-[rgb(var(--color-text-secondary))]">
                  Select one option. You can submit one role application at a time.
                </p>
                {roleClosedNotice && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm text-amber-400">{roleClosedNotice}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {STAFF_ROLES.map((role) => {
                    const roleSetting = roleForms[role.id];
                    const isRoleOpen = roleSetting?.isOpen ?? true;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelect(role.id)}
                        className={`text-left border rounded-2xl p-5 transition-all ${
                          isRoleOpen
                            ? 'bg-[rgb(var(--color-bg-secondary))] border-[rgb(var(--color-border))] hover:border-blue-500/60 hover:shadow-blue-glow'
                            : 'bg-[rgb(var(--color-bg-secondary))]/60 border-red-500/30 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <FiShield className={`w-4 h-4 ${isRoleOpen ? 'text-blue-500' : 'text-red-400'}`} />
                            <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">{role.label}</h3>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                              isRoleOpen
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isRoleOpen ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                        <p className="text-sm text-[rgb(var(--color-text-secondary))]">{role.shortDescription}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : isSelectedRoleClosed ? (
              <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-red-500/30 shadow-apple-md space-y-5 text-center">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">{getRoleLabel(selectedRole)} Form Closed</h2>
                <p className="text-[rgb(var(--color-text-secondary))]">{selectedRoleClosedMessage}</p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-secondary))] transition-all"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Choose Another Role
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold uppercase tracking-wide">
                        Selected Role
                      </div>
                      <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">{getRoleLabel(selectedRole)}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRole(null)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-bg-secondary))] transition-all"
                    >
                      <FiArrowLeft className="w-4 h-4" />
                      Change Role
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-4">
                    {session.user?.image ? (
                      <img src={session.user.image} alt={session.user.name || 'User'} className="w-12 h-12 rounded-full border border-blue-500" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FiUser className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{session.user?.name || 'Discord User'}</p>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">ID: {session.user?.id}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md space-y-5">
                  <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))]">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">Country</span>
                      <input
                        type="text"
                        value={profileData.country}
                        onChange={(event) => setProfileData((prev) => ({ ...prev, country: event.target.value }))}
                        placeholder="India"
                        className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">Timezone</span>
                      <input
                        type="text"
                        value={profileData.timezone}
                        onChange={(event) => setProfileData((prev) => ({ ...prev, timezone: event.target.value }))}
                        placeholder="IST (UTC+5:30)"
                        className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">Age</span>
                      <input
                        type="number"
                        min="13"
                        value={profileData.age}
                        onChange={(event) => setProfileData((prev) => ({ ...prev, age: event.target.value }))}
                        placeholder="18"
                        className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-apple-md space-y-6">
                  <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))]">Application Form</h3>

                  {activeQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))]">
                        {index + 1}. {question.title}
                      </label>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] leading-relaxed">{question.prompt}</p>
                      <textarea
                        value={answers[question.id] || ''}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                        rows={5}
                        placeholder={question.placeholder}
                        className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-8 py-4 rounded-2xl transition-all shadow-apple-md hover:shadow-blue-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-black border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-[rgb(var(--color-border))] mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light space-y-2">
            <p>© 2026 Omeglee. All rights reserved.</p>
            <a href="https://discord.gg/omegle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[rgb(var(--color-text-secondary))] transition-all">
              Join Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
