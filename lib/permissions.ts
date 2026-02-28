/**
 * Permission System for Admin Dashboard
 * 
 * Hierarchy:
 * 1. Server Owner / Admin / Manage Server → Full Access
 * 2. Specific Role IDs → View-Only Access (VC Stats + Chat Stats)
 * 3. Casino Role IDs → Casino Economy Dashboard Access
 */

const GUILD_ID = "910043773130661918";

// View-only role IDs (can only view VC stats and chat stats)
const VIEW_ONLY_ROLE_IDS = [
  "1470334506337828874",
  "1474416428772888739"
];

// Casino admin role IDs (can manage shop items)
// Note: These are fetched from database, but we also allow these hardcoded roles
const CASINO_ADMIN_ROLE_IDS: string[] = [
  "1470329047262167040"  // Casino Admin Role
];

// Discord permission bits
const PERMISSIONS = {
  ADMINISTRATOR: 0x0000000000000008n,
  MANAGE_GUILD: 0x0000000000000020n,
};

export interface UserPermissions {
  hasFullAccess: boolean;      // Full admin access
  hasViewOnlyAccess: boolean;  // Can only view VC stats and chat stats
  hasCasinoAccess: boolean;    // Can manage casino/shop items
  hasAnyAccess: boolean;        // Either full or view-only or casino
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

    // Check for casino admin roles
    const allCasinoRoles = [...CASINO_ADMIN_ROLE_IDS, ...casinoRoleIds];
    const hasCasinoRole = roles.some((roleId) =>
      allCasinoRoles.includes(roleId)
    );
    const hasCasinoAccess = hasFullAccess || hasCasinoRole;

    return {
      hasFullAccess,
      hasViewOnlyAccess: hasViewOnlyRole,
      hasCasinoAccess,
      hasAnyAccess: hasFullAccess || hasViewOnlyRole || hasCasinoAccess,
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

/**
 * Check if user can access casino economy dashboard
 */
export function canAccessCasinoDashboard(perms: UserPermissions): boolean {
  return perms.hasCasinoAccess; // Full access or casino role
}
