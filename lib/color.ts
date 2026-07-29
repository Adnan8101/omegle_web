/** Brand blue, used whenever Discord gives us no accent colour to work with. */
export const DEFAULT_ACCENT = '#3B9EFF';

const HEX = /^#?([\da-f]{3}|[\da-f]{6})$/i;

/**
 * `#7c3aed` → `"124, 58, 237"` — the triplet form so callers can drop it into
 * `rgba(var(--x), 0.4)` and vary alpha without re-deriving the colour.
 */
export function hexToRgbTriplet(hex: string | null | undefined): string {
  const match = typeof hex === 'string' ? hex.trim().match(HEX) : null;
  if (!match) return hexToRgbTriplet(DEFAULT_ACCENT);

  let value = match[1];
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');

  const int = parseInt(value, 16);
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}
