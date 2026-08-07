const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv/config');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, discoverable: true },
  });
  console.log('TENANTS:', JSON.stringify(tenants, null, 2));

  const products = await prisma.product.findMany({
    where: { name: { contains: 'leather', mode: 'insensitive' } },
    select: { id: true, name: true, category: true, tenantId: true },
  });
  console.log('MATCHING PRODUCTS:', JSON.stringify(products, null, 2));
}

main().finally(() => prisma.$disconnect());
