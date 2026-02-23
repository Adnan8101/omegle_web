import NextAuth from "next-auth";
import { UserPermissions } from "../lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      hasAccess?: boolean; // For backward compatibility
      permissions?: UserPermissions;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    discordId?: string;
  }
}
