import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { checkUserPermissions,UserPermissions } from "./permissions";
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
        token.error = undefined; 
        token.permissions = {
          hasFullAccess: false,
          hasModeratorAccess: false,
          hasViewOnlyAccess: false,
          hasCasinoAccess: false,
          hasAnyAccess: false,
          isOwner: false,
          isAdmin: false,
          hasManageServer: false,
          hasSrModAccess: false, 
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
            token.error = undefined; 
          } else {
            console.error('[Auth] Token refresh rejected by Discord, status:', response.status);
            token.error = 'RefreshAccessTokenError';
            return token; 
          }
        } catch (error) {
          console.error('[Auth] Token refresh network error:', error);
          token.error = 'RefreshAccessTokenError';
          return token; 
        }
      }
      const nowMs = Date.now();
      if (!token.accessCheckedAt || nowMs - token.accessCheckedAt > ACCESS_CHECK_INTERVAL) {
        try {
          let casinoRoleIds: string[] = [];
          let srModRoleIds: string[] = [];
          let modRoleIds: string[] = [];
          let staffRoleIds: string[] = [];
          let adminRoleId: string | null = null;
          const shouldSkipDbFetch = casinoRoleDbFailedAt > 0 && (nowMs - casinoRoleDbFailedAt < CASINO_ROLE_DB_RETRY_MS);
          try {
            if (!shouldSkipDbFetch) {
              const [modRoles, adminRoleRecord] = await Promise.all([
                prismaBot.modRole.findMany({ where: { guild_id: GUILD_ID } }).catch(() => []),
                prismaBot.adminRole.findUnique({ where: { guild_id: GUILD_ID } }).catch(() => null)
              ]);
              modRoleIds = modRoles.map((r: any) => r.role_id);
              casinoRoleIds = modRoles.filter((r: any) => r.economy === true).map((r: any) => r.role_id);
              srModRoleIds = modRoleIds;
              staffRoleIds = modRoleIds;
              adminRoleId = adminRoleRecord?.role_id || null;
              casinoRoleDbFailedAt = 0;
              console.log('[Auth] Fetched roles from DB:', { casinoRoleIds, srModRoleIds, modRoleIds, staffRoleIds, adminRoleId });
            } else {
              casinoRoleIds = [];
              srModRoleIds = [];
              modRoleIds = [];
              staffRoleIds = [];
            }
          } catch (dbError) {
            casinoRoleDbFailedAt = nowMs;
            console.error('[Auth] Failed to fetch roles from DB (non-fatal):', dbError);
            casinoRoleIds = [];
            srModRoleIds = [];
            modRoleIds = [];
            staffRoleIds = [];
          }
          const previousPermissions = token.permissions as UserPermissions | undefined;
          const permissions = await checkUserPermissions(token.accessToken, casinoRoleIds, srModRoleIds, modRoleIds, staffRoleIds, adminRoleId);
          const previousHadRealRoles =
            Boolean(previousPermissions?.hasAnyAccess) &&
            Array.isArray(previousPermissions?.roles) &&
            previousPermissions!.roles.length > 0;
          const lostAccessTransiently =
            previousHadRealRoles &&
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
      session.error = token.error;
      session.user.permissions = token.permissions || {
        hasFullAccess: false,
        hasModeratorAccess: false,
        hasViewOnlyAccess: false,
        hasCasinoAccess: false,
        hasAnyAccess: false,
        isOwner: false,
        isAdmin: false,
        hasManageServer: false,
        hasSrModAccess: false,
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