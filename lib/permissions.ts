/**
 * Permission System for Admin Dashboard
 * 
 * Hierarchy:
 * 1. Server Owner / Admin / Manage Server → Full Access
 * 2. Specific Role IDs → View-Only Access (VC Stats + Chat Stats)
 * 3. Casino Role IDs → Casino Economy Dashboard Access
 */

const GUILD_ID = "910043773130661918";

// Trail Mod / Staff Role IDs (can view VC stats and chat stats only)
const TRAIL_MOD_ROLE_IDS = [
  "1470799621927338298"  // Trail Mod / Staff Role
];

// Moderator role IDs (can view VC + chat + server stats)
const MODERATOR_ROLE_IDS = [
  "1470334572557369384"  // Moderator
];

// View-only role IDs (can only view VC stats and chat stats)
// Combining Trail Mod and general view-only roles
const VIEW_ONLY_ROLE_IDS = [
  "1470799621927338298",  // Trail Mod / Staff Role
  "1470334506337828874",
  "1474416428772888739"
];

// Casino admin role IDs (can manage casino/economy section)
const CASINO_ADMIN_ROLE_IDS: string[] = [
  "1470329047262167040"  // Casino Role
];

// Moderator can access more than view-only (includes server stats)
const MODERATOR_ACCESSIBLE_SECTIONS = [
  "vc_stats",
  "chat_stats", 
  "server_stats"
];

// Discord permission bits
const PERMISSIONS = {
  ADMINISTRATOR: 0x0000000000000008n,
  MANAGE_GUILD: 0x0000000000000020n,
};

export interface UserPermissions {
  hasFullAccess: boolean;      // Full admin access (manage server/admin/owner)
  hasModeratorAccess: boolean; // Moderator access (VC + chat + server stats)
  hasViewOnlyAccess: boolean;  // Trail Mod/Staff (VC stats and chat stats only)
  hasCasinoAccess: boolean;    // Casino/economy section only
  hasAnyAccess: boolean;        // Any access level
  isOwner: boolean;
  isAdmin: boolean;
  hasManageServer: boolean;
  roles: string[];
}

/**
 * Check user permissions based on Discord member data
 */
export async function checkUserPermissions(
  accessToken: string,
  casinoRoleIds: string[] = []
): Promise<UserPermissions> {
  const defaultPerms: UserPermissions = {
    hasFullAccess: false,
    hasModeratorAccess: false,
    hasViewOnlyAccess: false,
    hasCasinoAccess: false,
    hasAnyAccess: false,
    isOwner: false,
    isAdmin: false,
    hasManageServer: false,
    roles: [],
  };

  try {
    // Fetch guild member data
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch member data:", response.status);
      return defaultPerms;
    }

    const member = await response.json();
    const roles: string[] = member.roles || [];
    const permissions = BigInt(member.permissions || 0);

    // Check for owner/admin/manage server permissions
    const isAdmin = (permissions & PERMISSIONS.ADMINISTRATOR) !== 0n;
    const hasManageServer = (permissions & PERMISSIONS.MANAGE_GUILD) !== 0n;

    // Note: Discord doesn't include owner in member.permissions directly,
    // but admins typically have all permissions anyway
    const hasFullAccess = isAdmin || hasManageServer;

    // Check for moderator roles (VC + chat + server stats)
    const hasModeratorRole = !hasFullAccess && roles.some((roleId) =>
      MODERATOR_ROLE_IDS.includes(roleId)
    );

    // Check for view-only/trail mod roles (only if not already moderator or full access)
    const hasViewOnlyRole = !hasFullAccess && !hasModeratorRole && roles.some((roleId) =>
      TRAIL_MOD_ROLE_IDS.includes(roleId)
    );

    // Check for casino admin roles
    const allCasinoRoles = [...CASINO_ADMIN_ROLE_IDS, ...casinoRoleIds];
    const hasCasinoRole = roles.some((roleId) =>
      allCasinoRoles.includes(roleId)
    );
    const hasCasinoAccess = hasFullAccess || hasCasinoRole;

    return {
      hasFullAccess,
      hasModeratorAccess: hasModeratorRole,
      hasViewOnlyAccess: hasViewOnlyRole,
      hasCasinoAccess,
      hasAnyAccess: hasFullAccess || hasModeratorRole || hasViewOnlyRole || hasCasinoAccess,
      isOwner: false, // Can't reliably detect from member endpoint
      isAdmin,
      hasManageServer,
      roles,
    };
  } catch (error) {
    console.error("Error checking user permissions:", error);
    return defaultPerms;
  }
}

/**
 * Check if user can access full dashboard (all features)
 * Requires: Admin / Manage Server / Owner
 */
export function canAccessFullDashboard(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}

/**
 * Check if user can access VC transcript page
 * Requires: Full Access, Moderator, or Trail Mod/Staff
 */
export function canAccessVCTranscript(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess || perms.hasViewOnlyAccess;
}

/**
 * Check if user can access chat logs page
 * Requires: Full Access, Moderator, or Trail Mod/Staff
 */
export function canAccessChatLogs(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess || perms.hasViewOnlyAccess;
}

/**
 * Check if user can access server stats
 * Requires: Full Access or Moderator (NOT Trail Mod/Staff)
 */
export function canAccessServerStats(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess;
}

/**
 * Check if user can access staff applications (admin only)
 * Requires: Full Access only
 */
export function canAccessApplications(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}

/**
 * Check if user can access moderator stats
 * Requires: Full Access only
 */
export function canAccessModStats(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}

/**
 * Check if user can access casino economy dashboard
 * Requires: Full Access or Casino Role
 */
export function canAccessCasinoDashboard(perms: UserPermissions): boolean {
  return perms.hasCasinoAccess;
}
