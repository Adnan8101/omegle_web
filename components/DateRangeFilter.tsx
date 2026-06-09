'use client';
import { useEffect,useState } from 'react';
import { FiCalendar,FiX } from 'react-icons/fi';
interface DateRangeFilterProps {
    onChange: (range: { startDate: string | null; endDate: string | null }) => void;
    className?: string;
    initialRange?: { startDate: string | null; endDate: string | null };
}
const PRESETS = [
    { label: 'Today', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
    { label: 'All Time', days: null },
] as const;
export default function DateRangeFilter({ onChange, className = '', initialRange }: DateRangeFilterProps) {
    const [activePreset, setActivePreset] = useState<string>('All Time');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    useEffect(() => {
        if (initialRange && !hasInitialized) {
            setHasInitialized(true);
            if (!initialRange.startDate && !initialRange.endDate) {
                setActivePreset('All Time');
            } else {
                const now = new Date();
                const start = initialRange.startDate ? new Date(initialRange.startDate) : null;
                if (start) {
                    const daysDiff = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const matchedPreset = PRESETS.find(p => p.days === daysDiff);
                    if (matchedPreset) {
                        setActivePreset(matchedPreset.label);
                    } else {
                        setActivePreset('');
                        setCustomStart(initialRange.startDate?.split('T')[0] || '');
                        setCustomEnd(initialRange.endDate?.split('T')[0] || '');
                        setShowCustom(true);
                    }
                }
            }
        }
    }, [initialRange, hasInitialized]);
    const handlePreset = (preset: typeof PRESETS[number]) => {
        setActivePreset(preset.label);
        setShowCustom(false);
        setCustomStart('');
        setCustomEnd('');
        if (preset.days === null) {
            onChange({ startDate: null, endDate: null });
        } else if (preset.days === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            onChange({
                startDate: today.toISOString(),
                endDate: new Date().toISOString(),
            });
        } else {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - preset.days);
            start.setHours(0, 0, 0, 0);
            onChange({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });
        }
    };
    const handleCustomApply = () => {
        if (!customStart && !customEnd) return;
        setActivePreset('');
        const startDate = customStart ? new Date(customStart).toISOString() : null;
        const endDate = customEnd
            ? new Date(customEnd + 'T23:59:59').toISOString()
            : new Date().toISOString();
        onChange({ startDate, endDate });
    };
    const handleClear = () => {
        setActivePreset('All Time');
        setCustomStart('');
        setCustomEnd('');
        setShowCustom(false);
        onChange({ startDate: null, endDate: null });
    };
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {}
            {PRESETS.map((preset) => (
                <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${activePreset === preset.label
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                        }`}
                >
                    {preset.label}
                </button>
            ))}
            {}
            <button
                onClick={() => setShowCustom(!showCustom)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${showCustom || (!activePreset && (customStart || customEnd))
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                    }`}
            >
                <FiCalendar className="w-3 h-3" />
                Custom
            </button>
            {}
            {showCustom && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start date"
                    />
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="End date"
                    />
                    <button
                        onClick={handleCustomApply}
                        disabled={!customStart && !customEnd}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Apply
                    </button>
                    {(customStart || customEnd) && (
                        <button
                            onClick={handleClear}
                            className="p-1.5 rounded-lg text-[rgb(var(--color-text-tertiary))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
            {}
            {(activePreset && activePreset !== 'All Time') && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-lg text-xs text-blue-400">
                    <span>Filtering: {activePreset}</span>
                    <button onClick={handleClear} className="hover:text-blue-300">
                        <FiX className="w-3 h-3" />
                    </button>
                </div>
            )}
            {(!activePreset && (customStart || customEnd)) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-lg text-xs text-purple-400">
                    <span>Custom: {customStart || 'Start'} → {customEnd || 'Now'}</span>
                    <button onClick={handleClear} className="hover:text-purple-300">
                        <FiX className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}