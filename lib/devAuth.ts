import { UserPermissions } from './permissions';

/**
 * Same `ADMIN_DEV_BYPASS` flag already used by app/api/donator/* routes —
 * reused here for consistency rather than inventing a second convention.
 * Defaults on automatically for `next dev` (NODE_ENV is set by how the
 * process is launched, never by anything in an incoming request, unlike a
 * hostname/Host header — so this can't be tripped remotely in a real
 * deployment), but ADMIN_DEV_BYPASS can force it on or off explicitly.
 */
export const isLocalDevBypass =
  process.env.ADMIN_DEV_BYPASS === 'true' ||
  (process.env.NODE_ENV === 'development' && process.env.ADMIN_DEV_BYPASS !== 'false');

export const DEV_BYPASS_PERMISSIONS: UserPermissions = {
  hasFullAccess: true,
  hasModeratorAccess: true,
  hasViewOnlyAccess: true,
  hasCasinoAccess: true,
  hasSrModAccess: true,
  hasAnyAccess: true,
  isOwner: true,
  isAdmin: true,
  hasManageServer: true,
  roles: [],
};
