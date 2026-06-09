import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { checkUserPermissions, UserPermissions } from "./permissions";
import { prismaBot } from "./prismaBot";
const ACCESS_CHECK_INTERVAL = 60 * 1000;
const CASINO_ROLE_DB_RETRY_MS = 5 * 60 * 1000;
const GUILD_ID = "1507458872225566811";
let casinoRoleDbFailedAt = 0;
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds guilds.members.read",
          prompt: "consent",
          permissions: "0"
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.discordId = profile.id;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.permissions = {
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
        token.accessCheckedAt = 0;
      }
      const now = Math.floor(Date.now() / 1000);
      if (token.expiresAt && token.expiresAt < now) {
        try {
          const response = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.DISCORD_CLIENT_ID!,
              client_secret: process.env.DISCORD_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });
          if (response.ok) {
            const tokens = await response.json();
            token.accessToken = tokens.access_token;
            token.expiresAt = now + tokens.expires_in;
            token.refreshToken = tokens.refresh_token ?? token.refreshToken;
          }
        } catch (error) {
        }
      }
      const nowMs = Date.now();
      if (!token.accessCheckedAt || nowMs - token.accessCheckedAt > ACCESS_CHECK_INTERVAL) {
        try {
          let casinoRoleIds: string[] = [];
          let srModRoleIds: string[] = [];
          let modRoleIds: string[] = [];
          const shouldSkipDbFetch = casinoRoleDbFailedAt > 0 && (nowMs - casinoRoleDbFailedAt < CASINO_ROLE_DB_RETRY_MS);
          try {
            if (!shouldSkipDbFetch) {
              const [casinoRoles, srModRoles, modRoles] = await Promise.all([
                prismaBot.casinoAdminRole.findMany({ where: { guild_id: GUILD_ID } }).catch(() => []),
                prismaBot.srModRole.findMany({ where: { guild_id: GUILD_ID } }).catch(() => []),
                prismaBot.modRole.findMany({ where: { guild_id: GUILD_ID } }).catch(() => [])
              ]);
              casinoRoleIds = casinoRoles.map((r: any) => r.role_id);
              srModRoleIds = srModRoles.map((r: any) => r.role_id);
              modRoleIds = modRoles.map((r: any) => r.role_id);
              casinoRoleDbFailedAt = 0;
              console.log('[Auth] Fetched roles from DB:', { casinoRoleIds, srModRoleIds, modRoleIds });
            } else {
              casinoRoleIds = ["1470329047262167040"];
              modRoleIds = ["1470334572557369384"];
            }
          } catch (dbError) {
            casinoRoleDbFailedAt = nowMs;
            console.error('[Auth] Failed to fetch roles from DB (non-fatal):', dbError);
            casinoRoleIds = ["1470329047262167040"];
            modRoleIds = ["1470334572557369384"];
          }
          if (casinoRoleIds.length === 0) casinoRoleIds = ["1470329047262167040"];
          if (modRoleIds.length === 0) modRoleIds = ["1470334572557369384"];
          const previousPermissions = token.permissions as UserPermissions | undefined;
          const permissions = await checkUserPermissions(token.accessToken, casinoRoleIds, srModRoleIds, modRoleIds);
          const lostAccessTransiently =
            Boolean(previousPermissions?.hasAnyAccess) &&
            !permissions.hasAnyAccess &&
            Array.isArray(permissions.roles) &&
            permissions.roles.length === 0;
          const nextPermissions = lostAccessTransiently ? previousPermissions! : permissions;
          if (lostAccessTransiently) {
            console.warn('[Auth] Preserving previous permissions due transient empty Discord permission response');
          }
          console.log('[Auth] Permission check result:', {
            hasCasinoAccess: nextPermissions.hasCasinoAccess,
            hasFullAccess: nextPermissions.hasFullAccess,
            roles: nextPermissions.roles,
            casinoRoleIds
          });
          token.permissions = nextPermissions;
          token.hasAccess = nextPermissions.hasAnyAccess;
          token.accessCheckedAt = nowMs;
        } catch (error) {
          console.error('[Auth] Permission check failed:', error);
          if (!token.permissions || !token.accessCheckedAt) {
            token.permissions = {
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
            token.hasAccess = false;
          }
          token.accessCheckedAt = nowMs;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (!session.user) {
        session.user = {};
      }
      session.user.id = token.discordId;
      session.accessToken = token.accessToken;
      session.user.hasAccess = token.hasAccess ?? false;
      session.user.permissions = token.permissions || {
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
      return session;
    },
  },
  pages: {
    signIn: "/admin/signin",
    error: "/admin/error",
  },
};