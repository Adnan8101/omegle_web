// Developer Access — dev-only entry point used while the gambling economy is
// being finalized. Client-safe constants (no server-only imports) so both the
// homepage popup and the wheel page can import them.
//
// The dev password only bypasses the game's enable-gate on the backend; the
// real OZY economy (balance, spin chances, payouts, history) still applies.
// Remove the Developer Access button before launch (it is gated behind an env
// flag in the UI).

export const DEV_ACCESS_PASSWORD = '123Byte123';
export const DEV_ACCESS_STORAGE_KEY = 'wheel_dev_access';
export const DEV_ACCESS_HEADER = 'x-dev-access';

/**
 * Server-side check: does the provided candidate match the dev password?
 * `process.env.WHEEL_DEV_PASSWORD` overrides the default when set.
 * Runs on the server only; on the client `process.env.WHEEL_DEV_PASSWORD` is
 * simply undefined and the default is used (this function is never called
 * client-side).
 */
export function isDevPassword(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const expected = process.env.WHEEL_DEV_PASSWORD || DEV_ACCESS_PASSWORD;
  return candidate === expected;
}
