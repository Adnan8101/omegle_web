const GUILD_ID = "1507458872225566811";
const PERMISSIONS = {
  ADMINISTRATOR: 0x0000000000000008n,
  MANAGE_GUILD: 0x0000000000000020n,
};
export interface UserPermissions {
  hasFullAccess: boolean;
  hasModeratorAccess: boolean;
  hasViewOnlyAccess: boolean;
  hasCasinoAccess: boolean;
  hasAnyAccess: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  hasManageServer: boolean;
  roles: string[];
  hasSrModAccess: boolean;
}
export async function checkUserPermissions(
  accessToken: string,
  casinoRoleIds: string[] = [],
  srModRoleIds: string[] = [],
  modRoleIds: string[] = [],
  staffRoleIds: string[] = []
): Promise<UserPermissions> {
  const defaultPerms: UserPermissions = {
    hasFullAccess: false,
    hasModeratorAccess: false,
    hasViewOnlyAccess: false,
    hasCasinoAccess: false,
    hasSrModAccess: false,
    hasAnyAccess: false,
    isOwner: false,
    isAdmin: false,
    hasManageServer: false,
    roles: [],
  };
  try {
    let response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    let member: any = null;
    let userId: string | null = null;
    if (!response.ok) {
      console.error("OAuth member fetch failed:", {
        status: response.status,
        statusText: response.statusText
      });
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
      casinoRoleIds,
      srModRoleIds,
      modRoleIds,
      staffRoleIds,
    });
    const isAdmin = (permissions & PERMISSIONS.ADMINISTRATOR) !== 0n;
    const hasManageServer = (permissions & PERMISSIONS.MANAGE_GUILD) !== 0n;
    let isOwner = member.owner === true;
    if (!isOwner) {
      try {
        const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (guildsResponse.ok) {
          const guilds = await guildsResponse.json();
          const targetGuild = Array.isArray(guilds)
            ? guilds.find((guild: any) => guild?.id === GUILD_ID)
            : null;
          isOwner = Boolean(targetGuild?.owner);
        }
      } catch (guildError) {
        console.error('Failed to check guild ownership:', guildError);
      }
    }
    const hasFullAccess = isAdmin || hasManageServer || isOwner;
    console.log("🔐 Permission results:", {
      isAdmin,
      hasManageServer,
      isOwner,
      hasFullAccess,
    });
    const allModRoles = [...modRoleIds];
    const hasModeratorRole = !hasFullAccess && roles.some((roleId) =>
      allModRoles.includes(roleId)
    );
    const hasViewOnlyRole = !hasFullAccess && !hasModeratorRole && roles.some((roleId) =>
      staffRoleIds.includes(roleId)
    );
    const allCasinoRoles = [...casinoRoleIds];
    const hasCasinoRole = roles.some((roleId) =>
      allCasinoRoles.includes(roleId)
    );
    const hasCasinoAccess = hasFullAccess || hasCasinoRole;
    const hasSrModRole = !hasFullAccess && roles.some((roleId) =>
      srModRoleIds.includes(roleId)
    );
    console.log("✅ Permission check results:", {
      isOwner,
      isAdmin,
      hasManageServer,
      hasFullAccess,
      hasModeratorRole,
      hasViewOnlyRole,
      hasCasinoRole,
      hasCasinoAccess,
      hasSrModRole,
      matchedCasinoRole: roles.find(r => allCasinoRoles.includes(r)),
      matchedViewOnlyRole: roles.find(r => staffRoleIds.includes(r)),
    });
    return {
      hasFullAccess,
      hasModeratorAccess: hasModeratorRole,
      hasViewOnlyAccess: hasViewOnlyRole,
      hasCasinoAccess,
      hasSrModAccess: hasSrModRole,
      hasAnyAccess: hasFullAccess || hasModeratorRole || hasViewOnlyRole || hasCasinoAccess || hasSrModRole,
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
export function canAccessFullDashboard(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}
export function canAccessVCTranscript(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess || perms.hasViewOnlyAccess;
}
export function canAccessChatLogs(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess || perms.hasViewOnlyAccess;
}
export function canAccessServerStats(perms: UserPermissions): boolean {
  return perms.hasFullAccess || perms.hasModeratorAccess;
}
export function canAccessApplications(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}
export function canAccessModStats(perms: UserPermissions): boolean {
  return perms.hasFullAccess;
}
export function canAccessCasinoDashboard(perms: UserPermissions): boolean {
  return perms.hasCasinoAccess;
}