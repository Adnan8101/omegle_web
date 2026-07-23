

export const WHEEL_GAME_KEY = 'wheel';

export const WHEEL_SOURCE = 'wheel';

export const SEGMENT_COUNT_OPTIONS = [4, 5, 6, 7, 8, 10, 12] as const;
export type SegmentCount = (typeof SEGMENT_COUNT_OPTIONS)[number];

export const DEFAULT_SEGMENT_COLORS = [
  '#3b82f6', 
  '#8b5cf6', 
  '#ec4899', 
  '#f59e0b', 
  '#10b981', 
  '#ef4444', 
  '#06b6d4', 
  '#f97316', 
  '#a855f7', 
  '#14b8a6', 
  '#eab308', 
  '#6366f1', 
];
