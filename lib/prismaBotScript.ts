/**
 * Prisma client for the bot database - for Node.js scripts
 * (Not edge runtime)
 */
import { PrismaClient } from '@prisma/client';

export const prismaBotScript = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BOT_DATABASE_URL,
    },
  },
});
