import { PrismaClient } from '@prisma/client';
declare global {
  var prismaBotClient: PrismaClient | undefined;
}
export const prismaBot = global.prismaBotClient || new PrismaClient({
  datasources: {
    db: {
      url: process.env.BOT_DATABASE_WRITE_URL || process.env.BOT_DATABASE_URL,
    },
  },
});
if (process.env.NODE_ENV !== 'production') global.prismaBotClient = prismaBot;