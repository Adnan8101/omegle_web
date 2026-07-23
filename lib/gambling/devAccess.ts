

export const DEV_ACCESS_PASSWORD = '123Byte123';
export const DEV_ACCESS_STORAGE_KEY = 'wheel_dev_access';
export const DEV_ACCESS_HEADER = 'x-dev-access';

export function isDevPassword(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const expected = process.env.WHEEL_DEV_PASSWORD || DEV_ACCESS_PASSWORD;
  return candidate === expected;
}
