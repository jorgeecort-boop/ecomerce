/**
 * One-time migration to translate English product titles to Spanish.
 * Uses keyword-based mapping for common tech product terms.
 *
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} packages/db/prisma/translate-titles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRANSLATIONS: Array<[RegExp, string]> = [
  // Chargers & Power
  [/Wireless Charger/i, 'Cargador Inalámbrico'],
  [/Fast Charging/i, 'Carga Rápida'],
  [/Charging Station/i, 'Estación de Carga'],
  [/Charger Stand/i, 'Base de Carga'],
  [/Power Bank/i, 'Batería Externa'],
  [/Magnetic Wireless Charger/i, 'Cargador Magnético Inalámbrico'],
  [/Foldable Wireless Charger/i, 'Cargador Inalámbrico Plegable'],
  [/Charging Dock/i, 'Base de Carga'],
  [/Wireless Chargers? Stand/i, 'Base de Carga Inalámbrica'],
  [/Fast Charger/i, 'Cargador Rápido'],

  // Audio
  [/Headphones?/i, 'Audífonos'],
  [/Earbuds?/i, 'Audífonos Inalámbricos'],
  [/Bluetooth Earphones?/i, 'Audífonos Bluetooth'],
  [/ANC/i, 'con Cancelación de Ruido'],
  [/Noise Cancelling/i, 'Cancelación de Ruido'],
  [/Speaker/i, 'Parlante'],
  [/Bluetooth Speaker/i, 'Parlante Bluetooth'],

  // Phone Accessories
  [/Phone Holder/i, 'Soporte para Celular'],
  [/Phone Stand/i, 'Soporte para Celular'],
  [/Car Phone Holder/i, 'Soporte para Carro'],
  [/Car Mount/i, 'Soporte para Carro'],
  [/Phone Case/i, 'Funda para Celular'],
  [/Screen Protector/i, 'Protector de Pantalla'],
  [/Phone Stand Holder/i, 'Soporte Ajustable'],

  // Smartwatch / Wearables
  [/Smartwatch/i, 'Smartwatch'],
  [/Smart Watch/i, 'Smartwatch'],
  [/Fitness Tracker/i, 'Monitor de Actividad'],
  [/Health Monitor/i, 'Monitor de Salud'],

  // Cables & Hubs
  [/USB[- ]?C? Hub/i, 'Hub USB'],
  [/USB[- ]?C? Cable/i, 'Cable USB'],
  [/USB[- ]?C? Adapter/i, 'Adaptador USB'],
  [/HDMI/i, 'HDMI'],
  [/Type[- ]?C/i, 'Tipo-C'],

  // Lighting
  [/LED Lamp/i, 'Lámpara LED'],
  [/Night Light/i, 'Luz Nocturna'],
  [/Desk Lamp/i, 'Lámpara de Escritorio'],
  [/Reading Lamp/i, 'Lámpara de Lectura'],
  [/Ring Light/i, 'Aro de Luz'],
  [/LED Light/i, 'Luz LED'],
  [/Atmosphere Light/i, 'Luz Ambiental'],
  [/Mood Light/i, 'Luz Decorativa'],

  // Projectors
  [/Projector/i, 'Proyector'],
  [/Mini Projector/i, 'Mini Proyector'],
  [/Portable Projector/i, 'Proyector Portátil'],
  [/HD Projector/i, 'Proyector HD'],
  [/4K Projector/i, 'Proyector 4K'],

  // Cleaning
  [/Screen Cleaner/i, 'Kit de Limpieza'],
  [/Cleaning Kit/i, 'Kit de Limpieza'],
  [/Microfiber Cloth/i, 'Paño de Microfibra'],

  // Stands & Holders
  [/Laptop Stand/i, 'Soporte para Laptop'],
  [/Tablet Stand/i, 'Soporte para Tablet'],
  [/Adjustable Stand/i, 'Soporte Ajustable'],
  [/Rotating Stand/i, 'Soporte Giratorio'],
  [/foldable Stand/i, 'Soporte Plegable'],

  // Mugs & Heating
  [/Mug Warmer/i, 'Calentador de Taza'],
  [/Heating Mug/i, 'Taza Térmica'],
  [/Coffee Warmer/i, 'Calentador de Café'],

  // Other
  [/Alarm Clock/i, 'Reloj Despertador'],
  [/Digital Clock/i, 'Reloj Digital'],
  [/LED Clock/i, 'Reloj LED'],
  [/Keychain/i, 'Llavero'],
  [/Mini Battery/i, 'Batería Mini'],
  [/Gimbal/i, 'Estabilizador'],
  [/Tripod/i, 'Trípode'],
  [/Face Tracking/i, 'Seguimiento Facial'],
  [/Auto Tracking/i, 'Seguimiento Automático'],
  [/AI Smart/i, 'Inteligente'],
  [/Smart Phone/i, 'Celular'],
  [/Smartphone/i, 'Celular'],
  [/For IPhone/i, 'para iPhone'],
  [/For I-Phone/i, 'para iPhone'],
  [/For IWatch/i, 'para Apple Watch'],
  [/For Apple Watch/i, 'para Apple Watch'],
  [/For Airpods/i, 'para AirPods'],
  [/For Phone/i, 'para Celular'],
  [/For Smart Phone/i, 'para Celular'],
  [/For Home/i, 'para Hogar'],
  [/For Office/i, 'para Oficina'],
  [/For Car/i, 'para Carro'],
  [/For Laptop/i, 'para Laptop'],
  [/Compatible/i, 'Compatible'],

  // Numbers and connectors
  [/In 1/i, 'en 1'],
  [/2 In 1/i, '2 en 1'],
  [/3 In 1/i, '3 en 1'],
  [/4 In 1/i, '4 en 1'],
  [/5 In 1/i, '5 en 1'],
  [/6 In 1/i, '6 en 1'],
  [/7 In 1/i, '7 en 1'],
  [/Multi[- ]?Function/i, 'Multifunción'],
  [/Multi[- ]?Device/i, 'Multidispositivo'],
  [/Fast Charging Dock/i, 'Base de Carga Rápida'],
  [/Wireless Charging/i, 'Carga Inalámbrica'],
  [/Quick Charge/i, 'Carga Rápida'],

  // Quality words
  [/High Definition/i, 'Alta Definición'],
  [/High Quality/i, 'Alta Calidad'],
  [/Premium/i, 'Premium'],
  [/Portable/i, 'Portátil'],
  [/Compact/i, 'Compacto'],
  [/Ultra[- ]?Compact/i, 'Ultra Compacto'],
  [/Magnetic Levitating/i, 'Levitación Magnética'],
  [/Rotating/i, 'Giratorio'],
  [/Floating/i, 'Flotante'],
  [/360 Degree/i, '360°'],
  [/360°/i, '360°'],
  [/Ball Lamp/i, 'Lámpara Esfera'],
  [/Moon/i, 'Luna'],
  [/3D LED/i, 'LED 3D'],
  [/1080P/i, '1080P'],
  [/4K/i, '4K'],
  [/15W/i, '15W'],
  [/25W/i, '25W'],
  [/30000mAh/i, '30000mAh'],
  [/1500mAh/i, '1500mAh'],
  [/mAh/i, 'mAh'],

  // Decoration / School / Office
  [/School/i, 'Escolar'],
  [/Office/i, 'de Oficina'],
  [/Bookshop/i, 'de Librería'],
  [/Home Decoration/i, 'Decoración de Hogar'],
  [/Decoration/i, 'Decoración'],
  [/Gadgets/i, 'Tecnología'],
  [/Accessories?/i, 'Accesorios'],

  // Live/Streaming
  [/Vlog/i, 'Vlog'],
  [/Live/i, 'En Vivo'],
  [/Stabilizer/i, 'Estabilizador'],
  [/Streaming/i, 'Streaming'],
];

function translateTitle(title: string): string {
  let translated = title;

  for (const [regex, replacement] of TRANSLATIONS) {
    translated = translated.replace(regex, replacement);
  }

  // Clean up: normalize spaces
  translated = translated.replace(/\s+/g, ' ').trim();

  return translated;
}

async function main() {
  console.log('Traduciendo títulos de productos...\n');

  const products = await prisma.product.findMany({
    select: { id: true, title: true },
  });

  let translated = 0;

  for (const product of products) {
    const newTitle = translateTitle(product.title);

    if (newTitle !== product.title) {
      await prisma.product.update({
        where: { id: product.id },
        data: { title: newTitle },
      });
      console.log(`  "${product.title.slice(0, 60)}..."`);
      console.log(`  → "${newTitle.slice(0, 80)}..."\n`);
      translated++;
    }
  }

  console.log(`${translated} productos traducidos.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
