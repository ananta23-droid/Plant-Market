import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create categories
  const categories = [
    { name: 'Flowering Plants', description: 'Plants that produce beautiful flowers' },
    { name: 'Succulents & Cacti', description: 'Drought-tolerant plants with fleshy leaves' },
    { name: 'Herbs & Edibles', description: 'Culinary and medicinal herbs' },
    { name: 'Ferns & Foliage', description: 'Grown primarily for their attractive leaves' },
    { name: 'Indoor Trees & Palms', description: 'Larger plants that add drama to indoor spaces' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('Categories seeded.');

  // 2. Hash passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const vendorPassword = await bcrypt.hash('Vendor@123', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);

  // 3. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@plantmarket.com' },
    update: {},
    create: {
      name: 'Platform Administrator',
      email: 'admin@plantmarket.com',
      password: adminPassword,
      role: 'ADMIN',
      phone: '+9779800000000',
    },
  });
  console.log('Admin user created/verified.');

  // 4. Create Vendor User & Storefront
  const vendorUser = await prisma.user.upsert({
    where: { email: 'evergreen@nursery.com' },
    update: {},
    create: {
      name: 'Evergreen Nursery Owner',
      email: 'evergreen@nursery.com',
      password: vendorPassword,
      role: 'VENDOR',
      phone: '+9779811111111',
    },
  });

  const vendorStore = await prisma.vendor.upsert({
    where: { user_id: vendorUser.id },
    update: {},
    create: {
      user_id: vendorUser.id,
      store_name: 'Evergreen Nursery',
      description: 'Your premium source for healthy indoor and outdoor plants.',
      verification_status: 'APPROVED',
    },
  });
  console.log('Vendor user and nursery storefront created/verified.');

  // 5. Create Customer User & Cart
  const customerUser = await prisma.user.upsert({
    where: { email: 'john@customer.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@customer.com',
      password: customerPassword,
      role: 'CUSTOMER',
      phone: '+9779822222222',
    },
  });

  await prisma.cart.upsert({
    where: { user_id: customerUser.id },
    update: {},
    create: {
      user_id: customerUser.id,
    },
  });
  console.log('Customer user and cart created/verified.');

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
