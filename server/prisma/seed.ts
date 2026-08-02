import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const tenant = await prisma.tenant.create({
    data: {
      name: "Selam Boutique (Demo)",
      slug: "selam-boutique-demo",
      botToken: "DEMO_BOT_TOKEN_REPLACE_ME",
      botUsername: "SelamBoutiqueDemoBot",
      currency: "ETB",
      discoverable: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: "demo@gebeyabot.com",
      passwordHash: "$2b$10$replaceWithARealBcryptHashLater",
      name: "Demo Owner",
      memberships: {
        create: {
          tenantId: tenant.id,
          role: "OWNER",
        },
      },
    },
  });

  const productData = [
    { name: "Men's Leather Jacket", category: "Clothing", price: 3200, stock: 8 },
    { name: "Women's Ankara Dress", category: "Clothing", price: 1800, stock: 12 },
    { name: "Running Shoes - Size 42", category: "Footwear", price: 2400, stock: 5 },
    { name: "Running Shoes - Size 43", category: "Footwear", price: 2400, stock: 3 },
    { name: "Wireless Earbuds", category: "Electronics", price: 1500, stock: 20 },
    { name: "Power Bank 20000mAh", category: "Electronics", price: 1200, stock: 15 },
    { name: "Leather Handbag", category: "Accessories", price: 2100, stock: 7 },
    { name: "Sunglasses - Classic", category: "Accessories", price: 650, stock: 25 },
    { name: "Men's Denim Jeans", category: "Clothing", price: 1400, stock: 18 },
    { name: "Habesha Kemis", category: "Clothing", price: 4500, stock: 4 },
    { name: "Smart Watch", category: "Electronics", price: 3800, stock: 6 },
    { name: "Canvas Sneakers", category: "Footwear", price: 1600, stock: 10 },
    { name: "Wool Scarf", category: "Accessories", price: 450, stock: 30 },
    { name: "Bluetooth Speaker", category: "Electronics", price: 2200, stock: 9 },
    { name: "Men's Formal Shirt", category: "Clothing", price: 950, stock: 22 },
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        images: [],
      },
    });
    products.push(product);
  }

  const order1 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerTelegramId: "123456789",
      status: "COMPLETED",
      totalAmount: products[0].price,
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 1,
            priceAtPurchase: products[0].price,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerTelegramId: "987654321",
      status: "PENDING",
      totalAmount: products[4].price + products[7].price,
      items: {
        create: [
          { productId: products[4].id, quantity: 1, priceAtPurchase: products[4].price },
          { productId: products[7].id, quantity: 1, priceAtPurchase: products[7].price },
        ],
      },
    },
  });

  console.log("Seed complete:", { tenant: tenant.name, user: user.email, products: products.length, orders: 2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
