'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Session } from 'next-auth';
import { FiAlertCircle, FiArrowLeft, FiSend } from 'react-icons/fi';
import { Item, Reveal, RevealGroup } from '@/components/motion';
import { COUNTRIES } from '../countries';
import { PremiumCheckbox, SelectField, TextAreaField, TextField } from './fields';
import { COMMON_QUESTIONS, ROLE_QUESTIONS, type StaffRoleMeta } from '@/lib/staffApplicationForm';

const MIN_ANSWER_LENGTH = 30;

export interface ProfileData {
  country: string;
  timezone: string;
  age: string;
}

interface ApplicationFormProps {
  role: StaffRoleMeta;
  session: Session;
  profileData: ProfileData;
  onProfileChange: (data: ProfileData) => void;
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  onChangeRole: () => void;
  onSubmit: () => Promise<string | null>;
}

/**
 * The one and only long-form step. Errors surface per-field instead of an
 * alert() — the submit handler collects them all, focuses the first one,
 * and the field itself shows what's wrong.
 */
export default function ApplicationForm({
  role,
  session,
  profileData,
  onProfileChange,
  answers,
  onAnswerChange,
  onChangeRole,
  onSubmit,
}: ApplicationFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const questions = [...COMMON_QUESTIONS, ...ROLE_QUESTIONS[role.id]];

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!profileData.country.trim()) next.country = 'Required';
    if (!profileData.timezone.trim()) next.timezone = 'Required';
    const age = Number(profileData.age);
    if (!profileData.age.trim() || Number.isNaN(age) || age < 13) next.age = 'Must be 13 or older';
    for (const question of questions) {
      const value = answers[question.id]?.trim() || '';
      if (value.length < MIN_ANSWER_LENGTH) {
        next[question.id] = `At least ${MIN_ANSWER_LENGTH} characters`;
      }
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);
    const error = await onSubmit();
    setIsSubmitting(false);
    if (error) setSubmitError(error);
  };

  return (
    <form id="form-top" onSubmit={handleSubmit} className="space-y-5">
      {/* ── Selected role banner ─────────────────────────────────── */}
      <Reveal dir="up" distance={16} className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
        <div className="flex items-center gap-4 p-5">
          <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl">
            <Image src={role.image} alt="" fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: role.accent }}>
              Applying for
            </p>
            <h3 className="truncate text-[19px] font-extrabold tracking-[-0.01em] text-white">{role.label}</h3>
          </div>
          <button
            type="button"
            onClick={onChangeRole}
            className="fx-focus flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[12px] font-bold text-white/60 transition-colors hover:border-white/20 hover:text-white"
          >
            <FiArrowLeft className="h-3 w-3" />
            Change
          </button>
        </div>
        <div className="flex items-center gap-3 border-t border-white/6 bg-white/[0.02] px-5 py-3.5">
          <img
            src={session.user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt=""
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white/85">{session.user?.name || 'Discord User'}</p>
            <p className="truncate font-mono text-[10.5px] text-white/30">ID: {session.user?.id}</p>
          </div>
        </div>
      </Reveal>

      {/* ── Basic info ───────────────────────────────────────────── */}
      <Reveal dir="up" distance={16} delay={0.05} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <h3 className="mb-5 text-[16px] font-extrabold tracking-[-0.01em] text-white">Basic information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Country"
            value={profileData.country}
            onChange={(value) => onProfileChange({ ...profileData, country: value })}
            options={COUNTRIES}
            error={errors.country}
            accent={role.accent}
          />
          <TextField
            label="Timezone"
            value={profileData.timezone}
            onChange={(value) => onProfileChange({ ...profileData, timezone: value })}
            placeholder="IST (UTC+5:30)"
            error={errors.timezone}
            accent={role.accent}
          />
          <TextField
            label="Age"
            type="number"
            min="13"
            value={profileData.age}
            onChange={(value) => onProfileChange({ ...profileData, age: value })}
            placeholder="18"
            error={errors.age}
            accent={role.accent}
          />
        </div>
      </Reveal>

      {/* ── Questions ────────────────────────────────────────────── */}
      <Reveal dir="up" distance={16} delay={0.1} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <h3 className="mb-5 text-[16px] font-extrabold tracking-[-0.01em] text-white">Application questions</h3>
        <RevealGroup stagger={0.05} className="space-y-5">
          {questions.map((question, index) => (
            <Item key={question.id} distance={14}>
              <TextAreaField
                label={`${index + 1}. ${question.title}`}
                hint={question.prompt}
                value={answers[question.id] || ''}
                onChange={(value) => onAnswerChange(question.id, value)}
                placeholder={question.placeholder}
                error={errors[question.id]}
                accent={role.accent}
                minLength={MIN_ANSWER_LENGTH}
              />
            </Item>
          ))}
        </RevealGroup>
      </Reveal>

      {submitError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3.5">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
          <p className="text-[13px] leading-relaxed text-red-200">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="fx-focus flex w-full items-center justify-center gap-2 rounded-full py-4 text-[14.5px] font-extrabold text-black transition-transform duration-200 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: role.accent }}
      >
        {isSubmitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Submitting…
          </>
        ) : (
          <>
            <FiSend className="h-4 w-4" />
            Submit application
          </>
        )}
      </button>
    </form>
  );
}
