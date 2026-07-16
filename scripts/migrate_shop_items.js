require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BOT_DATABASE_WRITE_URL || process.env.BOT_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

const MAPPING = [
  { name: "nitro basic", actual: 150, price_inr: 880 },
  { name: "nitro booster", actual: 500, price_inr: 299 },
  { name: "nameplate", actual: 120, price_inr: 255 },
  { name: "avatar decor", actual: 120, price_inr: 255 },
  { name: "profile decor", actual: 120, price_inr: 255 },
  { name: "steam code", actual: 150, price_inr: 150 },
  { name: "free fire", actual: 236, price_inr: 240 },
  { name: "bgmi", actual: 380, price_inr: 380 },
  { name: "netflix", actual: 129, price_inr: 149 },
  { name: "amazon prime", actual: 49, price_inr: 299 },
  { name: "spotify", actual: 60, price_inr: 139 },
  { name: "crunchyroll", actual: 39, price_inr: 79 },
  { name: "meccha chameleon", actual: 309, price_inr: 309 }
];

async function main() {
  console.log('Fetching all shop items...');
  const items = await prisma.shopItem.findMany();
  console.log(`Found ${items.length} shop items.`);

  let updatedCount = 0;

  for (const item of items) {
    const itemNameClean = item.name.toLowerCase().replace(/e\b/g, ''); // normalize 'decor'/'decore'
    
    // Find matching configuration
    const match = MAPPING.find(m => {
      const matchNameClean = m.name.toLowerCase().replace(/e\b/g, '');
      return itemNameClean.includes(matchNameClean);
    });
    
    if (match) {
      const actualInr = match.actual;
      const priceInr = match.price_inr;
      const ozyPrice = actualInr * 9;

      console.log(`Matching item found: "${item.name}" -> mapped to "${match.name}"`);
      console.log(`  - Setting Cost Price (Actual INR): ₹${actualInr}`);
      console.log(`  - Setting Selling Price (Price INR): ₹${priceInr}`);
      console.log(`  - Setting Ozy Price: ${ozyPrice} OZY`);

      await prisma.shopItem.update({
        where: { id: item.id },
        data: {
          actual_inr: actualInr,
          price_inr: priceInr,
          price: ozyPrice
        }
      });
      updatedCount++;
    } else {
      console.log(`⚠️ No match found for item: "${item.name}"`);
    }
  }

  console.log(`Migration completed successfully. Updated ${updatedCount} items.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
