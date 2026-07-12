import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ───────────────────────────────────────────────
const seedPassword = process.env.SEED_ADMIN_PASSWORD || (() => { throw new Error('SEED_ADMIN_PASSWORD env var required'); })();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecomerce.com' },
    update: {
      password: hashedPassword,
      isActive: true,
    },
    create: {
      email: 'admin@ecomerce.com',
      password: hashedPassword,
      name: 'Admin',
      isActive: true,
    },
  });
  console.log('✅ User:', admin.email);

  // ─── Demo Store ───────────────────────────────────────────────
  const store = await prisma.store.upsert({
    where: { slug: 'tienda-demo' },
    update: {},
    create: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      ownerId: admin.id,
      isActive: true,
      settings: {
        currency: 'COP',
        timezone: 'America/Bogota',
        language: 'es',
      },
    },
  });
  console.log('✅ Store:', store.slug);

  // ─── Products ─────────────────────────────────────────────────
  const products = [
    {
      title: 'Traductor de Idiomas Portátil',
      description:
        'Traductor instantáneo con soporte para más de 137 idiomas. Ideal para viajes de negocios y turismo. Conexión WiFi y SIM, pantalla táctil 3.5".',
      price: 189000,
      compareAtPrice: 250000,
      costPrice: 85000,
      images: [
        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800',
        'https://images.unsplash.com/photo-1555421689-d68471e189f2?w=800',
      ],
      category: 'Electrónica',
      tags: ['traductor', 'viaje', 'idiomas', 'gadget'],
      inventory: 50,
      isPublished: true,
      isFeatured: true,
      trendScore: 92.5,
    },
    {
      title: 'Masajeador Eléctrico de Cuello y Hombros',
      description:
        'Masajeador cervical con calor infrarrojo, 6 cabezales de masaje y 15 niveles de intensidad. Alivia tensión muscular en minutos.',
      price: 95000,
      compareAtPrice: 140000,
      costPrice: 38000,
      images: [
        'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=800',
      ],
      category: 'Salud y Bienestar',
      tags: ['masajeador', 'salud', 'relajacion', 'cuello'],
      inventory: 75,
      isPublished: true,
      isFeatured: false,
      trendScore: 85.0,
    },
    {
      title: 'Mini Proyector LED Portátil 4K',
      description:
        'Proyector compacto con resolución 4K, brillo 9500 lúmenes, conexión HDMI, USB y WiFi. Batería integrada de 5 horas. Compatible con Netflix y YouTube.',
      price: 320000,
      compareAtPrice: 420000,
      costPrice: 150000,
      images: [
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
      ],
      category: 'Electrónica',
      tags: ['proyector', '4k', 'cine', 'portatil'],
      inventory: 30,
      isPublished: true,
      isFeatured: true,
      trendScore: 88.3,
    },
  ];

  for (const productData of products) {
    const existing = await prisma.product.findFirst({
      where: { storeId: store.id, title: productData.title },
    });

    if (!existing) {
      const product = await prisma.product.create({
        data: {
          ...productData,
          price: productData.price,
          compareAtPrice: productData.compareAtPrice,
          costPrice: productData.costPrice,
          storeId: store.id,
        },
      });
      console.log('✅ Product:', product.title);
    } else {
      console.log('⏭️  Product already exists:', productData.title);
    }
  }

  // ─── Demo Coupon ──────────────────────────────────────────────
  const coupon = await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: 'DEMO10' } },
    update: {},
    create: {
      storeId: store.id,
      code: 'DEMO10',
      description: '10% de descuento en tu primera compra',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 50000,
      usageLimit: 100,
      isActive: true,
    },
  });
  console.log('✅ Coupon:', coupon.code);

  console.log('\n🎉 Seed completado!');
  console.log('   Email:    admin@ecomerce.com');
  console.log('   Password: (set via SEED_ADMIN_PASSWORD env var)');
  console.log('   Store:    /store/tienda-demo');
  console.log('   Coupon:   DEMO10 (10% off, min $50.000 COP)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
