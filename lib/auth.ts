import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { checkUserPermissions, UserPermissions } from "./permissions";
import { prismaBot } from "./prismaBot";

// Cache permission checks to avoid hitting Discord API on every request
const ACCESS_CHECK_INTERVAL = 10 * 1000; // 10 seconds (for immediate updates)
const GUILD_ID = "910043773130661918";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { 
        params: { 
          scope: "identify guilds guilds.members.read",
          prompt: "consent",
          permissions: "0" // Request all permissions to be included in response
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
        // Initialize permissions on first login
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

      // Check if token is expired (refresh if needed)
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
          // Token refresh failed, user will need to re-authenticate
        }
      }

      const nowMs = Date.now();
      if (!token.accessCheckedAt || nowMs - token.accessCheckedAt > ACCESS_CHECK_INTERVAL) {
        try {
          // Fetch casino roles from database (with error handling)
          let casinoRoleIds: string[] = [];
          try {
            const casinoRoles = await prismaBot.casinoAdminRole.findMany({
              where: { guild_id: GUILD_ID }
            });
            casinoRoleIds = casinoRoles.map((r: any) => r.role_id);
            console.log('[Auth] Fetched casino roles from DB:', casinoRoleIds);
          } catch (dbError) {
            // Database error should not break authentication
            console.error('[Auth] Failed to fetch casino roles from DB (non-fatal):', dbError);
            // Use hardcoded fallback
            casinoRoleIds = ["1470329047262167040"];
          }
          
          const permissions = await checkUserPermissions(token.accessToken, casinoRoleIds);
          console.log('[Auth] Permission check result:', {
            hasCasinoAccess: permissions.hasCasinoAccess,
            hasFullAccess: permissions.hasFullAccess,
            roles: permissions.roles,
            casinoRoleIds
          });
          token.permissions = permissions;
          token.hasAccess = permissions.hasAnyAccess;
          token.accessCheckedAt = nowMs;
        } catch (error) {
          console.error('[Auth] Permission check failed:', error);
          // Keep existing permissions if we have them, otherwise use defaults
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
          // Still update the timestamp to avoid infinite retries
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
      session.user.hasAccess = token.hasAccess ?? false; // For backward compatibility
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
