'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

export interface EntityDropdownOption {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  color?: string | number | null;
}

interface EntityDropdownProps {
  label?: string;
  options: EntityDropdownOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  selectedOptions?: EntityDropdownOption[];
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  fetchOptions?: (query: string) => Promise<EntityDropdownOption[]>;
  disabled?: boolean;
  className?: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toCssColor(color?: string | number | null): string {
  if (typeof color === 'number') {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  if (typeof color === 'string' && color.trim()) {
    return color;
  }
  return '#99aab5';
}

export default function EntityDropdown({
  label,
  options,
  selectedIds,
  onChange,
  selectedOptions: selectedOptionsProp = [],
  multiple = true,
  placeholder = 'Select options',
  searchPlaceholder = 'Search by name or ID',
  emptyMessage = 'No options found',
  fetchOptions,
  disabled = false,
  className,
}: EntityDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<EntityDropdownOption[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!fetchOptions || !open) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingRemote(true);
      try {
        const next = await fetchOptions(query);
        if (!cancelled) {
          setRemoteOptions(Array.isArray(next) ? next : []);
        }
      } catch {
        if (!cancelled) {
          setRemoteOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRemote(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchOptions, open, query]);

  const filteredOptions = useMemo(() => {
    if (fetchOptions) {
      return remoteOptions;
    }

    const needle = normalizeText(query);
    if (!needle) return options;

    return options.filter((opt) => {
      const hay = [opt.name, opt.id, opt.subtitle || '']
        .map((v) => normalizeText(v))
        .join(' ');
      return hay.includes(needle);
    });
  }, [fetchOptions, options, query, remoteOptions]);

  const selectedOptions = useMemo(() => {
    const map = new Map<string, EntityDropdownOption>();
    for (const opt of options) map.set(opt.id, opt);
    for (const opt of remoteOptions) map.set(opt.id, opt);
    for (const opt of selectedOptionsProp) map.set(opt.id, opt);
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as EntityDropdownOption[];
  }, [options, remoteOptions, selectedIds, selectedOptionsProp]);

  const toggleSelection = (id: string) => {
    if (disabled) return;

    if (multiple) {
      if (selectedSet.has(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
      return;
    }

    if (selectedSet.has(id)) {
      onChange([]);
    } else {
      onChange([id]);
    }
    setOpen(false);
  };

  const removeSelection = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  };

  const triggerText = selectedOptions.length > 0
    ? multiple
      ? `${selectedOptions.length} selected`
      : selectedOptions[0]?.name || placeholder
    : placeholder;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
          className="w-full px-4 py-3 text-left rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))] hover:border-[rgb(var(--color-accent))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-3"
        >
          <span className="truncate text-sm text-[rgb(var(--color-text-primary))]">{triggerText}</span>
          <FiChevronDown className={`w-4 h-4 text-[rgb(var(--color-text-secondary))] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-40 mt-2 w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--color-border))]">
              <span className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Pick options</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-secondary))]"
                aria-label="Close dropdown"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 border-b border-[rgb(var(--color-border))]">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-sm focus:outline-none focus:border-[rgb(var(--color-accent))]"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
              {loadingRemote && fetchOptions && (
                <div className="px-3 py-2 text-xs text-[rgb(var(--color-text-tertiary))]">Searching...</div>
              )}
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-[rgb(var(--color-text-tertiary))]">{emptyMessage}</div>
              ) : (
                filteredOptions.map((opt) => {
                  const selected = selectedSet.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleSelection(opt.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors border ${selected ? 'bg-blue-500/15 border-blue-500/40' : 'border-transparent hover:bg-[rgb(var(--color-hover))]'}`}
                    >
                      {opt.avatarUrl ? (
                        <img src={opt.avatarUrl} alt={opt.name} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toCssColor(opt.color) }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[rgb(var(--color-text-primary))] truncate">{opt.name}</p>
                        {opt.subtitle && (
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))] truncate">{opt.subtitle}</p>
                        )}
                      </div>
                      {selected && <FiCheck className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-500/15 border border-blue-500/35 text-blue-400"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: toCssColor(opt.color) }} />
              <span className="truncate max-w-[14rem]">{opt.name}</span>
              <button
                type="button"
                onClick={() => removeSelection(opt.id)}
                className="ml-1 hover:text-red-400"
                aria-label={`Remove ${opt.name}`}
              >
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
