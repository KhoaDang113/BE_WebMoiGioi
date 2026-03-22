import "dotenv/config";
import prisma from './config/database.js';

async function test() {
  try {
    const count = await prisma.propertyType.count();
    console.log("PropertyType count:", count);
    if (count === 0) {
      console.log("Creating default PropertyType 1");
      await prisma.propertyType.create({
        data: { id: 1, name: 'Nhà đất' }
      });
    }
    console.log("Done checking PropertyType");
  } catch (err) {
    console.error("DB Error:", err);
  }
}

test();
