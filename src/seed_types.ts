import "dotenv/config";
import prisma from './config/database.js';

async function seedPropertyTypes() {
  try {
    const types = [
      { id: 1, name: 'Nhà riêng' },
      { id: 2, name: 'Căn hộ chung cư' },
      { id: 3, name: 'Biệt thự, liền kề' },
      { id: 4, name: 'Đất nền dự án' },
      { id: 5, name: 'Kho, nhà xưởng' },
    ];

    for (const t of types) {
      await prisma.propertyType.upsert({
        where: { id: t.id },
        update: { name: t.name },
        create: t,
      });
    }
    console.log("Seeded Property Types successfully.");
  } catch (error) {
    console.error("Error seeding Property Types:", error);
  }
}

seedPropertyTypes();
