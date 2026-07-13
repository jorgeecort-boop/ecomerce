const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { PrismaClient } = require('@prisma/client');

// Load env
const envPath = resolve(__dirname, '..', '..', '..', '.env');
try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} catch (err) {
  console.warn('Could not load .env');
}

async function main() {
  const prisma = new PrismaClient();
  const store = await prisma.store.findFirst({ where: { slug: 'tienda-demo' } });
  if (!store) {
    console.error('Store tienda-demo not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, price: true, sku: true },
  });

  let csv = 'productId,title,price,cj_pid,cj_vid,cj_variant_sku\n';
  for (const p of products) {
    const title = '"' + p.title.replace(/"/g, '""') + '"';
    csv += [p.id, title, p.price, '', '', ''].join(',') + '\n';
  }

  const outPath = resolve(process.cwd(), 'cj-mapping-template.csv');
  writeFileSync(outPath, csv, 'utf-8');
  console.log(`✅ Template exported: ${outPath}`);
  console.log(`   ${products.length} products`);
  console.log('\nInstrucciones:');
  console.log('1. Abre cj-mapping-template.csv');
  console.log('2. Para cada producto, busca el equivalente en CJ Dropshipping (https://cjdropshipping.com)');
  console.log('3. Llena: cj_pid, cj_vid, cj_variant_sku');
  console.log('4. Ejecuta: node apps/api/scripts/apply-cj-mapping.cjs cj-mapping-template.csv');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
