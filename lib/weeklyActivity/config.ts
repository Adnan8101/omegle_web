import { WeeklyCycleConfig, normalizeCycleConfig } from './weeklyCycle';

let cached: WeeklyCycleConfig | null = null;

export function weeklyCycleConfig(): WeeklyCycleConfig {
    if (cached) return cached;
    cached = normalizeCycleConfig({
        timeZone: process.env.WEEKLY_ACTIVITY_TIMEZONE,
        weekStartDay: process.env.WEEKLY_ACTIVITY_WEEK_START_DAY !== undefined
            ? Number(process.env.WEEKLY_ACTIVITY_WEEK_START_DAY)
            : undefined,
        weekStartHour: process.env.WEEKLY_ACTIVITY_WEEK_START_HOUR !== undefined
            ? Number(process.env.WEEKLY_ACTIVITY_WEEK_START_HOUR)
            : undefined,
    });
    return cached;
}
