import { PrismaClient } from '@prisma/client/edge';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prismaBot = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.BOT_DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') global.prisma = prismaBot;
