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

// Known administrator role IDs (as fallback if permissions field is not available)
// These roles should have full admin access
const ADMIN_ROLE_IDS: string[] = [
  "910086064109133844",  // Common admin role pattern
  "910922901107146823",  // Admin role
  "1469439337635643504", // Another admin role
  "1475568654560006165", // Tech support/admin role
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
    // First try: Use OAuth token to fetch member data
    let response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If OAuth fails, try getting user ID first and then use bot token
    let member: any = null;
    let userId: string | null = null;

    if (!response.ok) {
      console.error("OAuth member fetch failed:", {
        status: response.status,
        statusText: response.statusText
      });
      
      // Try to get user ID from OAuth token
      const userResponse = await fetch(
        `https://discord.com/api/v10/users/@me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (userResponse.ok) {
        const user = await userResponse.json();
        userId = user.id;
        console.log("Got user ID from OAuth:", userId);

        // Now try with bot token
        const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
        if (BOT_TOKEN && userId) {
          const botResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
            {
              headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
              },
            }
          );

          if (botResponse.ok) {
            member = await botResponse.json();
            console.log("Successfully fetched member data using bot token");
          } else {
            console.error("Bot token fetch also failed:", botResponse.status);
          }
        }
      }

      if (!member) {
        return defaultPerms;
      }
    } else {
      member = await response.json();
      console.log("Member data fetched successfully via OAuth:", {
        hasRoles: Array.isArray(member.roles),
        roleCount: member.roles?.length || 0,
        hasPermissions: !!member.permissions,
        permissionsValue: member.permissions,
        permissionsType: typeof member.permissions
      });
    }
    
    const roles: string[] = member.roles || [];
    // Handle both string and number permissions from Discord API
    let permissions: bigint;
    try {
      if (typeof member.permissions === 'string') {
        permissions = BigInt(member.permissions);
      } else if (typeof member.permissions === 'number') {
        permissions = BigInt(member.permissions);
      } else {
        permissions = 0n;
      }
    } catch (e) {
      console.error("Failed to parse permissions:", member.permissions, e);
      permissions = 0n;
    }

    console.log("🔍 Checking permissions for user:", {
      roleCount: roles.length,
      roles: roles,
      permissions: permissions.toString(),
      permissionsHex: '0x' + permissions.toString(16),
      casinoRoleIds: CASINO_ADMIN_ROLE_IDS,
    });

    // Check for owner/admin/manage server permissions
    const isAdmin = (permissions & PERMISSIONS.ADMINISTRATOR) !== 0n;
    const hasManageServer = (permissions & PERMISSIONS.MANAGE_GUILD) !== 0n;

    // Also check if user has server owner indicator (member.owner field)
    const isOwner = member.owner === true;

    // Fallback: Check for known admin role IDs (in case permissions field is not available)
    const hasAdminRole = roles.some((roleId) => ADMIN_ROLE_IDS.includes(roleId));

    // Full access if admin, manage server, server owner, or has admin role
    const hasFullAccess = isAdmin || hasManageServer || isOwner || hasAdminRole;

    // Check for moderator roles (VC + chat + server stats)
    const hasModeratorRole = !hasFullAccess && roles.some((roleId) =>
      MODERATOR_ROLE_IDS.includes(roleId)
    );

    // Check for view-only/trail mod roles (only if not already moderator or full access)
    const hasViewOnlyRole = !hasFullAccess && !hasModeratorRole && roles.some((roleId) =>
      VIEW_ONLY_ROLE_IDS.includes(roleId)
    );

    // Check for casino admin roles
    const allCasinoRoles = [...CASINO_ADMIN_ROLE_IDS, ...casinoRoleIds];
    const hasCasinoRole = roles.some((roleId) =>
      allCasinoRoles.includes(roleId)
    );
    const hasCasinoAccess = hasFullAccess || hasCasinoRole;

    console.log("✅ Permission check results:", {
      isOwner,
      isAdmin,
      hasManageServer,
      hasAdminRole,
      hasFullAccess,
      hasModeratorRole,
      hasViewOnlyRole,
      hasCasinoRole,
      hasCasinoAccess,
      matchedCasinoRole: roles.find(r => allCasinoRoles.includes(r)),
      matchedViewOnlyRole: roles.find(r => VIEW_ONLY_ROLE_IDS.includes(r)),
      matchedAdminRole: roles.find(r => ADMIN_ROLE_IDS.includes(r))
    });

    return {
      hasFullAccess,
      hasModeratorAccess: hasModeratorRole,
      hasViewOnlyAccess: hasViewOnlyRole,
      hasCasinoAccess,
      hasAnyAccess: hasFullAccess || hasModeratorRole || hasViewOnlyRole || hasCasinoAccess,
      isOwner,
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
