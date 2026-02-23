/**
 * Permission System for Admin Dashboard
 * 
 * Hierarchy:
 * 1. Server Owner / Admin / Manage Server → Full Access
 * 2. Specific Role IDs → View-Only Access (VC Stats + Chat Stats)
 */

const GUILD_ID = "910043773130661918";

// View-only role IDs (can only view VC stats and chat stats)
const VIEW_ONLY_ROLE_IDS = [
  "1470334506337828874",
  "1474416428772888739"
];

// Discord permission bits
const PERMISSIONS = {
  ADMINISTRATOR: 0x0000000000000008n,
  MANAGE_GUILD: 0x0000000000000020n,
};

export interface UserPermissions {
  hasFullAccess: boolean;      // Full admin access
  hasViewOnlyAccess: boolean;  // Can only view VC stats and chat stats
  hasAnyAccess: boolean;        // Either full or view-only
  isOwner: boolean;
  isAdmin: boolean;
  hasManageServer: boolean;
  roles: string[];
}

/**
 * Check user permissions based on Discord member data
 */
export async function checkUserPermissions(
  accessToken: string
): Promise<UserPermissions> {
  const defaultPerms: UserPermissions = {
    hasFullAccess: false,
    hasViewOnlyAccess: false,
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

    // Check for view-only roles (only if not already full access)
    const hasViewOnlyRole = !hasFullAccess && roles.some((roleId) =>
      VIEW_ONLY_ROLE_IDS.includes(roleId)
    );

    return {
      hasFullAccess,
      hasViewOnlyAccess: hasViewOnlyRole,
      hasAnyAccess: hasFullAccess || hasViewOnlyRole,
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
 */
export function canAccessFullDashboard(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}

/**
 * Check if user can access VC transcript page
 */
export function canAccessVCTranscript(perms: UserPermissions): boolean {
  return perms.hasAnyAccess; // Both full and view-only can access
}

/**
 * Check if user can access chat logs page
 */
export function canAccessChatLogs(perms: UserPermissions): boolean {
  return perms.hasAnyAccess; // Both full and view-only can access
}

/**
 * Check if user can access server stats
 */
export function canAccessServerStats(perms: UserPermissions): boolean {
  return perms.hasAnyAccess; // Both full and view-only can access
}

/**
 * Check if user can access staff applications (admin only)
 */
export function canAccessApplications(perms: UserPermissions): boolean {
  return perms.hasFullAccess; // Only full access
}
