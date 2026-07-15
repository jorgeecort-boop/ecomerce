/**
 * One-time migration to clean CJ cost-code descriptions.
 * Replaces descriptions like "$12", "$13" with Spanish descriptions
 * based on product category keywords.
 *
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} packages/db/prisma/clean-descriptions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  audifonos: 'Audífonos de alta calidad con sonido envolvente. Ideales para música, llamadas y gaming.',
  headphones: 'Audífonos de alta calidad con sonido envolvente. Ideales para música, llamadas y gaming.',
  earbuds: 'Audífonos inalámbricos compactos con estuche de carga. Sonido nítido y graves profundos.',
  cargador: 'Cargador rápido compatible con múltiples dispositivos. Carga segura y eficiente.',
  charger: 'Cargador rápido compatible con múltiples dispositivos. Carga segura y eficiente.',
  wireless: 'Cargador inalámbrico de carga rápida. Compatible con todos los dispositivos con carga Qi.',
  power: 'Batería externa de alta capacidad. Carga tus dispositivos en cualquier lugar.',
  reloj: 'Smartwatch con múltiples funciones de monitoreo. Ideal para deporte y uso diario.',
  smartwatch: 'Smartwatch con múltiples funciones de monitoreo. Ideal para deporte y uso diario.',
  watch: 'Smartwatch con múltiples funciones de monitoreo. Ideal para deporte y uso diario.',
  soporte: 'Soporte ajustable y resistente. Perfecto para escritorio, auto o streaming.',
  stand: 'Soporte ajustable y resistente. Perfecto para escritorio, auto o streaming.',
  holder: 'Soporte ajustable y resistente. Perfecto para escritorio, auto o streaming.',
  cable: 'Cable de alta velocidad y durabilidad. Conexión estable para todos tus dispositivos.',
  hub: 'Hub multipuerto para expandir la conectividad de tu dispositivo. Plug & Play.',
  lampara: 'Lámpara LED decorativa con diseño moderno. Iluminación ambiental para cualquier espacio.',
  light: 'Lámpara LED decorativa con diseño moderno. Iluminación ambiental para cualquier espacio.',
  lamp: 'Lámpara LED decorativa con diseño moderno. Iluminación ambiental para cualquier espacio.',
  ring: 'Kit de iluminación profesional para streaming y videollamadas. Luz ajustable.',
  proyector: 'Proyector portátil de alta definición. Disfruta de cine en casa en cualquier lugar.',
  projector: 'Proyector portátil de alta definición. Disfruta de cine en casa en cualquier lugar.',
  parlante: 'Parlante Bluetooth portátil con sonido potente y graves profundos.',
  speaker: 'Parlante Bluetooth portátil con sonido potente y graves profundos.',
  altavoz: 'Parlante Bluetooth portátil con sonido potente y graves profundos.',
  teclado: 'Teclado ergonómico con respuesta rápida. Ideal para trabajo y gaming.',
  keyboard: 'Teclado ergonómico con respuesta rápida. Ideal para trabajo y gaming.',
  mouse: 'Mouse ergonómico de alta precisión. Perfecto para trabajo y gaming.',
  camara: 'Cámara web de alta definición con micrófono integrado. Ideal para videollamadas.',
  webcam: 'Cámara web de alta definición con micrófono integrado. Ideal para videollamadas.',
  gimbal: 'Estabilizador inteligente para smartphone. Graba videos fluidos y profesionales.',
  limpiador: 'Kit de limpieza completo para pantallas y dispositivos electrónicos.',
  cleaner: 'Kit de limpieza completo para pantallas y dispositivos electrónicos.',
  taza: 'Taza térmica con calentador. Mantén tu bebida caliente mientras trabajas.',
  mug: 'Taza térmica con calentador. Mantén tu bebida caliente mientras trabajas.',
  magnetic: 'Dispositivo magnético de diseño innovador. Funcionalidad y estilo en uno solo.',
};

function isCostCodeDescription(desc: string): boolean {
  if (!desc || desc.length > 6) return false;
  return /^\$[0-9a-f]{1,2}$/i.test(desc);
}

function generateDescription(title: string): string {
  const lowerTitle = title.toLowerCase();

  for (const [keyword, description] of Object.entries(CATEGORY_DESCRIPTIONS)) {
    if (lowerTitle.includes(keyword)) {
      return description;
    }
  }

  return 'Producto tecnológico de alta calidad. Diseño innovador y funcionalidad excepcional.';
}

async function main() {
  console.log('Limpiando descripciones de productos...\n');

  const products = await prisma.product.findMany({
    select: { id: true, title: true, description: true },
  });

  let cleaned = 0;

  for (const product of products) {
    if (isCostCodeDescription(product.description)) {
      const newDesc = generateDescription(product.title);
      await prisma.product.update({
        where: { id: product.id },
        data: { description: newDesc },
      });
      console.log(`  "${product.title}": $${product.description} → "${newDesc.slice(0, 60)}..."`);
      cleaned++;
    }
  }

  console.log(`\n${cleaned} productos actualizados.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
