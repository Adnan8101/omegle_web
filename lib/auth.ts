import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { checkUserPermissions, UserPermissions } from "./permissions";

// Cache permission checks to avoid hitting Discord API on every request
const ACCESS_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds guilds.members.read", prompt: "consent" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.discordId = profile.id;
        // Initialize permissions on first login
        token.permissions = {
          hasFullAccess: false,
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

      // Re-check permissions if stale (every 5 minutes)
      const now = Date.now();
      if (!token.accessCheckedAt || now - token.accessCheckedAt > ACCESS_CHECK_INTERVAL) {
        try {
          const permissions = await checkUserPermissions(token.accessToken);
          token.permissions = permissions;
          token.hasAccess = permissions.hasAnyAccess; // For backward compatibility
        } catch (error) {
          console.error("Error checking permissions:", error);
          // Keep previous permissions if check fails
          if (!token.accessCheckedAt) {
            token.permissions = {
              hasFullAccess: false,
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
        }
        token.accessCheckedAt = now;
      }

      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.discordId;
      session.accessToken = token.accessToken;
      session.user.hasAccess = token.hasAccess ?? false; // For backward compatibility
      session.user.permissions = token.permissions || {
        hasFullAccess: false,
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
