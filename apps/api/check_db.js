require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({where: {email: 'sinrivoke@hotmail.com'}});
  if (!user) {
    console.log('User not found');
    return;
  }
  const stores = await prisma.store.findMany({where: {ownerId: user.id}, include: {products: true}});
  console.log(JSON.stringify(stores, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
