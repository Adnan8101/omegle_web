import { UserPermissions } from './permissions';

export function hasFullAccess(permissions?: UserPermissions): boolean {
  return permissions?.hasFullAccess ?? false;
}

export function hasModeratorAccess(permissions?: UserPermissions): boolean {
  return permissions?.hasModeratorAccess ?? false;
}

export function hasViewOnlyAccess(permissions?: UserPermissions): boolean {
  return permissions?.hasViewOnlyAccess ?? false;
}

export function hasCasinoAccess(permissions?: UserPermissions): boolean {
  return permissions?.hasCasinoAccess ?? false;
}

export function hasAnyAccess(permissions?: UserPermissions): boolean {
  return permissions?.hasAnyAccess ?? false;
}

export function canAccessVCAndChats(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasModeratorAccess(permissions) || hasViewOnlyAccess(permissions);
}

export function canAccessServerStats(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasModeratorAccess(permissions);
}

export function canAccessAdminFeatures(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions);
}

export function canAccessCasino(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasCasinoAccess(permissions);
}