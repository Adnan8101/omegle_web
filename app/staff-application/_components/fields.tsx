'use client';

import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiChevronDown } from 'react-icons/fi';

const DEFAULT_ACCENT = '#3B9EFF';

/** Label + optional hint + error message, wrapping any field control. */
function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-bold text-white/85">
          {label}
        </label>
        {error && <span className="text-[11.5px] font-semibold text-red-400">{error}</span>}
      </div>
      {hint && <p className="text-[12.5px] leading-relaxed text-white/40">{hint}</p>}
      {children}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  accent?: string;
  min?: string;
}

export function TextField({ label, hint, error, value, onChange, placeholder, type = 'text', accent = DEFAULT_ACCENT, min }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="fx-focus w-full rounded-[14px] border bg-white/[0.03] px-4 py-3.5 text-[14.5px] text-white placeholder-white/25 outline-none transition-colors duration-200"
        style={{
          borderColor: error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)',
          ['--fx-accent-rgb' as string]: hexToRgb(accent),
        }}
        onFocus={(event) => (event.currentTarget.style.borderColor = `${accent}80`)}
        onBlur={(event) => (event.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)')}
      />
    </FieldShell>
  );
}

interface SelectFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  accent?: string;
}

export function SelectField({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  accent = DEFAULT_ACCENT,
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="fx-focus w-full appearance-none rounded-[14px] border bg-white/[0.03] px-4 py-3.5 pr-10 text-[14.5px] text-white outline-none transition-colors duration-200"
          style={{ borderColor: error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)', ['--fx-accent-rgb' as string]: hexToRgb(accent) }}
          onFocus={(event) => (event.currentTarget.style.borderColor = `${accent}80`)}
          onBlur={(event) => (event.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)')}
        >
          <option value="" disabled className="bg-[#0a0a0f] text-white/40">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#0a0a0f] text-white">
              {option}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
      </div>
    </FieldShell>
  );
}

interface TextAreaFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accent?: string;
  minLength?: number;
}

export function TextAreaField({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  accent = DEFAULT_ACCENT,
  minLength = 0,
  rows = 5,
}: TextAreaFieldProps & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>) {
  const id = useId();
  const met = minLength > 0 && value.trim().length >= minLength;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="fx-focus w-full resize-y rounded-[14px] border bg-white/[0.03] px-4 py-3.5 text-[14.5px] leading-relaxed text-white placeholder-white/25 outline-none transition-colors duration-200"
          style={{ borderColor: error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)', ['--fx-accent-rgb' as string]: hexToRgb(accent) }}
          onFocus={(event) => (event.currentTarget.style.borderColor = `${accent}80`)}
          onBlur={(event) => (event.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)')}
        />
        {minLength > 0 && (
          <span
            className="pointer-events-none absolute bottom-3 right-3.5 text-[11px] font-bold"
            style={{ color: met ? '#34D399' : 'rgba(255,255,255,0.25)' }}
          >
            {value.trim().length}/{minLength}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export function PremiumCheckbox({
  checked,
  onChange,
  accent = DEFAULT_ACCENT,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <label className="flex cursor-pointer items-start gap-3 select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="fx-focus mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-200"
        style={{
          borderColor: checked ? accent : 'rgba(255,255,255,0.25)',
          background: checked ? accent : 'transparent',
          ['--fx-accent-rgb' as string]: hexToRgb(accent),
        }}
      >
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 28 }}
        >
          <FiCheck className="h-3.5 w-3.5 text-black" strokeWidth={3} />
        </motion.span>
      </button>
      <span className="text-[13.5px] leading-relaxed text-white/65">{children}</span>
    </label>
  );
}

function hexToRgb(hex: string): string {
  const match = hex.replace('#', '').match(/.{1,2}/g);
  if (!match) return '59, 158, 255';
  const [r, g, b] = match.map((c) => parseInt(c, 16));
  return `${r}, ${g}, ${b}`;
}
