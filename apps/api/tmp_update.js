const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({where: {email: 'sinrivoke@hotmail.com'}});
  if (user) {
    const store = await prisma.store.findFirst();
    if (store) {
        await prisma.store.update({
            where: { id: store.id },
            data: { ownerId: user.id }
        });
        await prisma.product.updateMany({
            data: { isPublished: true, storeId: store.id }
        });
        console.log('Todo actualizado: Tienda asignada a sinrivoke@hotmail.com y producto publicado.');
    } else {
        console.log('No hay tienda creada');
    }
  } else {
    console.log('Usuario no encontrado. Asegurate de registrarlo primero.');
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
