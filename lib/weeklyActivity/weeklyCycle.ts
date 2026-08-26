export interface WeeklyCycleConfig {
    timeZone: string;
    weekStartDay: number;
    weekStartHour: number;
}

export interface WeeklyCycleBounds {
    start: Date;
    end: Date;
}

export const DEFAULT_WEEKLY_CYCLE_CONFIG: WeeklyCycleConfig = {
    timeZone: 'UTC',
    weekStartDay: 1,
    weekStartHour: 0,
};

export const WEEK_LENGTH_DAYS = 7;

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

interface ZonedParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
    const cached = formatterCache.get(timeZone);
    if (cached) return cached;
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
    const parts = getFormatter(timeZone).formatToParts(date);
    const numeric: Record<string, number> = {};
    let weekday = 0;
    for (const part of parts) {
        if (part.type === 'weekday') {
            weekday = WEEKDAY_INDEX[part.value] ?? 0;
        } else if (part.type !== 'literal') {
            numeric[part.type] = Number(part.value);
        }
    }
    return {
        year: numeric.year,
        month: numeric.month,
        day: numeric.day,
        hour: numeric.hour % 24,
        minute: numeric.minute,
        second: numeric.second,
        weekday,
    };
}

function getZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = getZonedParts(date, timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    timeZone: string
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
    const firstOffset = getZoneOffsetMs(new Date(naive), timeZone);
    let timestamp = naive - firstOffset;
    const secondOffset = getZoneOffsetMs(new Date(timestamp), timeZone);
    if (secondOffset !== firstOffset) {
        timestamp = naive - secondOffset;
    }
    return new Date(timestamp);
}

export function normalizeCycleConfig(config?: Partial<WeeklyCycleConfig>): WeeklyCycleConfig {
    const timeZone = config?.timeZone && isValidTimeZone(config.timeZone)
        ? config.timeZone
        : DEFAULT_WEEKLY_CYCLE_CONFIG.timeZone;
    const rawDay = Number(config?.weekStartDay);
    const weekStartDay = Number.isInteger(rawDay) && rawDay >= 0 && rawDay <= 6
        ? rawDay
        : DEFAULT_WEEKLY_CYCLE_CONFIG.weekStartDay;
    const rawHour = Number(config?.weekStartHour);
    const weekStartHour = Number.isInteger(rawHour) && rawHour >= 0 && rawHour <= 23
        ? rawHour
        : DEFAULT_WEEKLY_CYCLE_CONFIG.weekStartHour;
    return { timeZone, weekStartDay, weekStartHour };
}

export function getCycleStart(now: Date, config: WeeklyCycleConfig): Date {
    const parts = getZonedParts(now, config.timeZone);
    const dayDelta = (parts.weekday - config.weekStartDay + 7) % 7;
    let start = zonedTimeToUtc(
        parts.year,
        parts.month,
        parts.day - dayDelta,
        config.weekStartHour,
        config.timeZone
    );
    if (start.getTime() > now.getTime()) {
        const shifted = getZonedParts(start, config.timeZone);
        start = zonedTimeToUtc(
            shifted.year,
            shifted.month,
            shifted.day - WEEK_LENGTH_DAYS,
            config.weekStartHour,
            config.timeZone
        );
    }
    return start;
}

export function getCycleEnd(start: Date, config: WeeklyCycleConfig): Date {
    const parts = getZonedParts(start, config.timeZone);
    return zonedTimeToUtc(
        parts.year,
        parts.month,
        parts.day + WEEK_LENGTH_DAYS,
        config.weekStartHour,
        config.timeZone
    );
}

export function getCycleBounds(now: Date, config: WeeklyCycleConfig): WeeklyCycleBounds {
    const start = getCycleStart(now, config);
    return { start, end: getCycleEnd(start, config) };
}

export function getNextCycleBounds(previousEnd: Date, config: WeeklyCycleConfig): WeeklyCycleBounds {
    return { start: previousEnd, end: getCycleEnd(previousEnd, config) };
}

export function getPreviousCycleBounds(start: Date, config: WeeklyCycleConfig): WeeklyCycleBounds {
    const parts = getZonedParts(start, config.timeZone);
    const previousStart = zonedTimeToUtc(
        parts.year,
        parts.month,
        parts.day - WEEK_LENGTH_DAYS,
        config.weekStartHour,
        config.timeZone
    );
    return { start: previousStart, end: start };
}
