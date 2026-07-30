/**
 * Global shop purchase cooldown.
 *
 * After any successful purchase the user cannot buy *any* other shop item until
 * the cooldown expires. The cooldown is shop-wide, not per item, and restarts
 * after every successful purchase.
 */

const MS_PER_HOUR = 3_600_000;

export interface PurchaseCooldownConfig {
  purchase_cooldown_enabled?: boolean | null;
  purchase_cooldown_hours?: number | null;
}

export interface PurchaseCooldownState {
  enabled: boolean;
  hours: number;
  active: boolean;
  lastPurchaseAt: string | null;
  availableAt: string | null;
  remainingMs: number;
}

export const INACTIVE_COOLDOWN: PurchaseCooldownState = {
  enabled: false,
  hours: 24,
  active: false,
  lastPurchaseAt: null,
  availableAt: null,
  remainingMs: 0
};

export function resolveCooldownHours(config: PurchaseCooldownConfig | null | undefined): number {
  const hours = Number(config?.purchase_cooldown_hours);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

export function buildCooldownState(
  config: PurchaseCooldownConfig | null | undefined,
  lastPurchaseAt: Date | null | undefined,
  now: Date = new Date()
): PurchaseCooldownState {
  const enabled = config?.purchase_cooldown_enabled === true;
  const hours = resolveCooldownHours(config);
  if (!enabled || !lastPurchaseAt) {
    return {
      ...INACTIVE_COOLDOWN,
      enabled,
      hours,
      lastPurchaseAt: lastPurchaseAt ? lastPurchaseAt.toISOString() : null
    };
  }
  const availableAt = new Date(lastPurchaseAt.getTime() + hours * MS_PER_HOUR);
  const remainingMs = availableAt.getTime() - now.getTime();
  return {
    enabled,
    hours,
    active: remainingMs > 0,
    lastPurchaseAt: lastPurchaseAt.toISOString(),
    availableAt: availableAt.toISOString(),
    remainingMs: Math.max(0, remainingMs)
  };
}

/** `HH:MM`, rounding partial minutes up so the banner never shows 00:00 early. */
export function formatCooldownHHMM(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
