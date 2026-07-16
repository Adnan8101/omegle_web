require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

// Use environment variables loaded via dotenv-cli or manually
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BOT_DATABASE_WRITE_URL || process.env.BOT_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Fetching all shop items...');
  const items = await prisma.shopItem.findMany();
  console.log(`Found ${items.length} shop items.`);

  for (const item of items) {
    const originalPrice = item.price;
    const originalPriceInr = item.price_inr;

    // Pricing system: actual_inr is price_inr if set, else price / 9
    let actualInr = originalPriceInr;
    if (!actualInr || actualInr <= 0) {
      actualInr = Math.round(originalPrice / 9);
    }
    
    const newPrice = actualInr * 9;

    console.log(`Migrating item "${item.name}" (ID: ${item.id}):`);
    console.log(`  - Original Price: ${originalPrice} OZY, Original INR: ${originalPriceInr} INR`);
    console.log(`  - New Price: ${newPrice} OZY, Actual INR: ${actualInr} INR`);

    await prisma.shopItem.update({
      where: { id: item.id },
      data: {
        actual_inr: actualInr,
        price_inr: actualInr, // Keep in sync for safety
        price: newPrice,
      },
    });
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
