import { UserPermissions } from './permissions';

/**
 * Helper functions for API authentication and authorization
 */

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

/**
 * Check if user can access VC transcripts and chat logs
 * Requires: Full Access, Moderator, or Trail Mod
 */
export function canAccessVCAndChats(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasModeratorAccess(permissions) || hasViewOnlyAccess(permissions);
}

/**
 * Check if user can access server stats
 * Requires: Full Access or Moderator (NOT Trail Mod)
 */
export function canAccessServerStats(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasModeratorAccess(permissions);
}

/**
 * Check if user can access admin-only features (applications, mod stats)
 * Requires: Full Access only
 */
export function canAccessAdminFeatures(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions);
}

/**
 * Check if user can access casino features
 * Requires: Full Access or Casino Role
 */
export function canAccessCasino(permissions?: UserPermissions): boolean {
  return hasFullAccess(permissions) || hasCasinoAccess(permissions);
}