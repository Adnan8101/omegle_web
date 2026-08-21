import 'dotenv/config';
import { prismaBot } from './lib/prismaBot';

async function main() {
  const result = await prismaBot.trainingChatMemory.deleteMany({});
  console.log(`Wiped ${result.count} corrupted memory records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaBot.$disconnect();
  });
